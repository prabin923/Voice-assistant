import type { EscalationReason } from "@/lib/escalation";
import type { HotelConfig } from "@/lib/hotelConfig";
import { bookings } from "@/lib/db";
import {
  cancelBookingSafe,
  createBookingSafe,
  modifyBookingSafe,
} from "@/lib/bookingService";
import { isPaymentEnabled, createDepositCheckoutSession, calculateDeposit } from "@/lib/stripePayment";
import { getTenantStore } from "@/lib/tenantContext";
import { notifyBookingComplete } from "@/lib/bookingNotify";
import { applyLoyaltyDiscount } from "@/lib/loyalty";
import {
  formatAlternativeSuggestions,
  formatAvailabilityList,
  formatAvailableWindows,
  findNextAvailableWindows,
  getAvailabilitySnapshot,
  suggestAlternatives,
} from "@/lib/availabilityQuery";
import { detectDateRange, todayIsoDate, type ChatHistoryMessage } from "@/lib/dateParsing";
import { getKeywordsForLanguage } from "@/lib/languages";

export type BookingSummary = {
  id: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  guestName: string;
  guestPhone: string;
  guestEmail?: string | null;
  status: string;
};

export type PendingBooking = {
  roomType: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  guestName: string;
  guestPhone: string;
  guestEmail?: string | null;
  specialRequests?: string | null;
};

export type BookingFlowResult = {
  handled: boolean;
  reply?: string;
  escalate?: boolean;
  reason?: EscalationReason;
  booking?: BookingSummary;
  pendingBooking?: PendingBooking | null;
};

type GuestProfile = { id: string; name: string; phone: string | null; email: string; bookingCount?: number };

/** Guest-authored text only — used for extracting facts the guest provided
 *  (room type, dates, name, phone, room count). Never includes the assistant's
 *  own messages, which may contain examples or confirmations that would be
 *  misread as guest input. */
function conversationText(message: string, history: ChatHistoryMessage[]): string {
  const userHistory = history.filter((h) => h.role === "user");
  return `${userHistory.map((h) => h.content).join(" ")} ${message}`;
}

/** Full conversation text (both roles) — used only where the assistant's
 *  messages legitimately carry data, e.g. a booking ID echoed in a confirmation. */
function fullConversationText(message: string, history: ChatHistoryMessage[]): string {
  return `${history.map((h) => h.content).join(" ")} ${message}`;
}

function matchesIntent(message: string, langCode: string, extra: string[]): boolean {
  const lower = message.toLowerCase();
  const keywords = getKeywordsForLanguage(langCode).booking;
  return [...keywords, ...extra].some((kw) => lower.includes(kw.toLowerCase()));
}

export function isBookingIntent(message: string, langCode: string): boolean {
  if (isCancelIntent(message) || isModifyIntent(message)) return false;
  const lower = message.toLowerCase();

  // Price / pure-info questions mention "room" but are NOT booking intents —
  // let RAG answer them. ("how much is the deluxe room?", "what's the rate?")
  if (/\b(how much|what'?s the (price|cost|rate)|price of|cost of|rate for|do you have a (pool|gym|spa))\b/i.test(lower)) {
    return false;
  }

  // Explicit booking verbs
  if (/\b(book|reserve|reservation|make a booking|hold a room)\b/i.test(lower)) return true;

  // Natural phrasings: "(can I) get/need/want/looking for … a room/suite/stay"
  if (/\b(get|need|want|looking for|would like|i'?d like|grab|take)\b[^.?!]{0,40}\b(room|suite|stay)\b/i.test(lower)) {
    return true;
  }

  // "a room/suite" combined with a date or time cue
  if (
    /\b(room|suite)\b/i.test(lower) &&
    /\b(tonight|tomorrow|this weekend|next week|in \d+ days?|for \d+ nights?|\d+ nights?|from|check.?in|\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2})\b/i.test(lower)
  ) {
    return true;
  }

  return matchesIntent(message, langCode, ["make a booking", "hold a room"]);
}

export function isAvailabilityIntent(message: string, langCode: string): boolean {
  const lower = message.toLowerCase();
  const keywords = getKeywordsForLanguage(langCode).booking;
  return (
    keywords.some((kw) => lower.includes(kw.toLowerCase())) &&
    /\b(available|availability|vacancy|vacancies|left|open)\b/i.test(lower) &&
    !/\b(cancel|modify|change|update)\b/i.test(lower)
  );
}

export function isCancelIntent(message: string): boolean {
  return /\b(cancel(?:lation)?|call off)\b.*\b(booking|reservation|stay)\b/i.test(message) ||
    /\b(booking|reservation)\b.*\b(cancel)\b/i.test(message);
}

export function isModifyIntent(message: string): boolean {
  return /\b(change|modify|update|move|reschedule)\b.*\b(booking|reservation|dates?|room)\b/i.test(message) ||
    /\b(booking|reservation)\b.*\b(change|modify|update)\b/i.test(message);
}

export function isAffirmative(message: string): boolean {
  const trimmed = message.trim();
  if (/^(yes|yeah|yep|yup|correct|confirm|confirmed|ok|okay|sure|absolutely)\b/i.test(trimmed)) return true;
  return /\b(yes|yeah|confirm|go ahead|sounds good|that's right|book it)\b/i.test(trimmed) && trimmed.length < 48;
}

export function isNegative(message: string): boolean {
  const trimmed = message.trim();
  if (/^(no|nope|nah|wait|stop|cancel|don't|not yet)\b/i.test(trimmed)) return true;
  return /\b(no|nope|not yet|hold on|change that)\b/i.test(trimmed) && trimmed.length < 40;
}

/**
 * Returns true when the message is a clear off-topic info request that should
 * NOT be routed to the booking confirmation flow, even when a pendingBooking
 * exists. Directions, parking, amenities, hotel services — anything that isn't
 * about confirming/changing the current booking.
 */
export function isTopicEscape(message: string): boolean {
  // Directions / how to get here
  if (/\b(how do i get|directions?|navigate to|where is the hotel|how to (?:get|reach|find|arrive)|get to the hotel|getting here|find you)\b/i.test(message)) return true;
  // Parking / transport (only if no booking verb)
  if (
    /\b(park(?:ing)?|valet|shuttle|transfer|taxi|uber|lyft|transport(?:ation)?|airport pick.?up)\b/i.test(message) &&
    !/\b(book|reserv|cancel|modify|confirm)\b/i.test(message)
  ) return true;
  // Hotel amenities / services (only when not combined with booking verbs)
  if (
    /\b(wifi|wi-fi|internet|password|pool|gym|fitness|spa|wellness|breakfast|restaurant|dining|menu|bar|lounge|opening hours|check-in time|check-out time|amenities|facilities|concierge|laundry|room service)\b/i.test(message) &&
    !/\b(book|reserv|cancel|modify|confirm|yes|no|sure|ok)\b/i.test(message)
  ) return true;
  return false;
}

/** "When is X available?" / "Do you have any free dates?" without specific dates. */
export function isFindAvailableDatesIntent(message: string): boolean {
  return /\b(when|which dates?|what dates?|any dates?|next available|earliest|soonest|free dates?|open dates?)\b/i.test(message) &&
    /\b(available|free|open|book|stay|room|suite|vacancy)\b/i.test(message) &&
    !/\b(\d{4}-\d{2}-\d{2}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d+(st|nd|rd|th))\b/i.test(message);
}

export function isSpecialRequestIntent(message: string): boolean {
  return /\b(special request|note for|add a note|request for my (?:stay|booking|room)|late checkout|early check-?in|extra (?:pillow|bed|towel)|allerg|dietary|accessibility|wheelchair|quiet room|high floor|low floor|anniversary|birthday)\b/i.test(
    message
  );
}

function extractSpecialRequestNote(message: string): string | null {
  const patterns = [
    /\b(?:special request|note|request)[:—-]\s*(.+)/i,
    /\b(?:please|can you)\s+(?:add|note|arrange)\s+(.+)/i,
  ];
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim().slice(0, 500);
  }
  if (isSpecialRequestIntent(message) && message.trim().length > 12) {
    return message.trim().slice(0, 500);
  }
  return null;
}

function calculateStayCost(
  pending: PendingBooking,
  config: HotelConfig,
  guestProfile?: GuestProfile
): { nights: number; perNight: number; total: number; currency: string; discountPercent?: number; savings?: number } | null {
  const room = config.rooms.find((r) => r.name === pending.roomType);
  if (!room || !room.pricePerNight) return null;
  const nights = Math.max(
    1,
    Math.round(
      (new Date(`${pending.checkOut}T12:00:00`).getTime() -
        new Date(`${pending.checkIn}T12:00:00`).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );

  const baseTotal = room.pricePerNight * nights * pending.rooms;
  const currency = room.currency || "USD";

  if (guestProfile?.bookingCount && guestProfile.bookingCount > 0) {
    const { discountedPrice, discountPercent, savings } = applyLoyaltyDiscount(baseTotal, guestProfile.bookingCount);
    return {
      nights,
      perNight: room.pricePerNight,
      total: discountedPrice,
      currency,
      discountPercent,
      savings,
    };
  }

  return {
    nights,
    perNight: room.pricePerNight,
    total: baseTotal,
    currency,
  };
}

function formatCost(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function buildConfirmationResponse(
  pending: PendingBooking,
  config: HotelConfig,
  guestProfile?: GuestProfile
): BookingFlowResult {
  const note = pending.specialRequests ? ` Note: ${pending.specialRequests}.` : "";
  const cost = calculateStayCost(pending, config, guestProfile);
  let costLine = "";
  if (cost) {
    const loyaltyNote = cost.discountPercent
      ? ` (includes ${cost.discountPercent}% loyalty discount — saved ${formatCost(cost.savings || 0, cost.currency)})`
      : "";
    costLine = ` Total: ${formatCost(cost.total, cost.currency)} (${formatCost(cost.perNight, cost.currency)}/night × ${cost.nights} night${cost.nights !== 1 ? "s" : ""}${pending.rooms > 1 ? ` × ${pending.rooms} rooms` : ""})${loyaltyNote}.`;
  }
  return {
    handled: true,
    reply: `Just to confirm: ${pending.rooms} ${pending.roomType} room(s), ${pending.checkIn} to ${pending.checkOut}, for ${pending.guestName} at ${config.branding.hotelName}.${costLine}${note} Reply yes to book, or tell me what to change.`,
    pendingBooking: pending,
    escalate: false,
  };
}

function mergePendingBooking(
  message: string,
  history: ChatHistoryMessage[],
  pending: PendingBooking,
  config: HotelConfig
): PendingBooking {
  const roomNames = config.rooms.map((r) => r.name);
  // Detect changes from the CURRENT message only — otherwise stale dates/room
  // from earlier in the conversation would override a guest's correction
  // ("actually change it to <new dates>").
  const dateRange = detectDateRange(message, []);
  const details = extractGuestDetails(message, []);
  const note = extractSpecialRequestNote(message);
  const newRooms = extractRequestedRooms(message, []);
  return {
    roomType: detectRoomType(message, [], roomNames) ?? pending.roomType,
    checkIn: dateRange.checkIn ?? pending.checkIn,
    checkOut: dateRange.checkOut ?? pending.checkOut,
    rooms: newRooms > 1 ? newRooms : pending.rooms,
    guestName: details.guestName ?? pending.guestName,
    guestPhone: details.guestPhone ?? pending.guestPhone,
    guestEmail: details.guestEmail ?? pending.guestEmail,
    specialRequests: note ? (pending.specialRequests ? `${pending.specialRequests}; ${note}` : note) : pending.specialRequests,
  };
}

async function handlePendingBookingConfirmation(
  message: string,
  history: ChatHistoryMessage[],
  pending: PendingBooking,
  config: HotelConfig,
  guestProfile?: GuestProfile
): Promise<BookingFlowResult> {
  if (isNegative(message)) {
    return {
      handled: true,
      reply: "No problem — what would you like to change? You can update dates, room type, or guest details.",
      pendingBooking: null,
      escalate: false,
    };
  }

  if (isAffirmative(message)) {
    const bookingResult = await createBookingSafe({
      roomType: pending.roomType,
      checkIn: pending.checkIn,
      checkOut: pending.checkOut,
      rooms: pending.rooms,
      guestName: pending.guestName,
      guestPhone: pending.guestPhone,
      guestEmail: pending.guestEmail,
      guestId: guestProfile?.id,
      specialRequests: pending.specialRequests,
    });

    if (isPaymentEnabled(config)) {
      try {
        const store = getTenantStore();
        const hotelId = store?.hotelId ?? "default";
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const { amount, currency } = calculateDeposit(pending, config);
        const session = await createDepositCheckoutSession(pending, config, hotelId, appUrl);

        return {
          handled: true,
          reply: `I have prepared your booking. To secure your stay, please pay the deposit of ${currency.toUpperCase()} ${(amount / 100).toFixed(2)} using this secure checkout link: ${session.url}`,
          pendingBooking: null,
          escalate: false,
        };
      } catch (err) {
        console.error("Failed to generate payment session in flow, falling back to direct booking:", err);
      }
    }

    if (!bookingResult.ok) {
      if (bookingResult.status === 409) {
        const alternatives = await suggestAlternatives(config, pending.checkIn, pending.checkOut, pending.roomType);
        return {
          handled: true,
          reply: `That room just became unavailable. ${formatAlternativeSuggestions(alternatives)}`,
          pendingBooking: null,
          escalate: false,
        };
      }
      return {
        handled: true,
        reply: "I couldn't complete the booking just now. Please try again in a moment.",
        pendingBooking: pending,
        escalate: bookingResult.status >= 500,
        reason: bookingResult.status >= 500 ? "ai_error" : undefined,
      };
    }

    const booking = bookingResult.booking;
    notifyBookingComplete(booking, "confirmed", message);

    const cost = calculateStayCost(pending, config, guestProfile);
    const totalCost = cost ? formatCost(cost.total, cost.currency) : undefined;

    return {
      handled: true,
      reply: serializeBookingReply({
        hotelName: config.branding.hotelName,
        roomType: pending.roomType,
        checkIn: pending.checkIn,
        checkOut: pending.checkOut,
        rooms: pending.rooms,
        guestName: pending.guestName,
        bookingId: booking.id,
        totalCost,
      }),
      booking: toSummary(booking),
      pendingBooking: null,
      escalate: false,
    };
  }

  const updated = mergePendingBooking(message, history, pending, config);
  return buildConfirmationResponse(updated, config);
}

async function handleSpecialRequest(
  message: string,
  history: ChatHistoryMessage[],
  config: HotelConfig,
  guestProfile?: GuestProfile
): Promise<BookingFlowResult> {
  const note = extractSpecialRequestNote(message);
  if (!note) {
    return {
      handled: true,
      reply: "I'd be happy to add a note to your stay — what would you like us to arrange? For example, late checkout, extra pillows, or dietary needs.",
      escalate: false,
    };
  }

  const record = await resolveBookingRecord(message, history, guestProfile);
  if (!record) {
    return {
      handled: true,
      reply: "I can add that note once I find your booking — share your confirmation number (first 8 characters) or sign in.",
      escalate: false,
    };
  }

  const updated = await bookings.appendSpecialRequest(record.id, note);
  if (!updated) {
    return {
      handled: true,
      reply: "I couldn't add that note to your booking. Please try again or ask for our front desk team.",
      escalate: false,
    };
  }

  void notifyBookingComplete(updated, "modified", `Special request: ${note}`);

  return {
    handled: true,
    reply: `Got it — I've added your request to booking #${record.id.slice(0, 8).toUpperCase()}. Our team has been notified.`,
    booking: toSummary(updated),
    escalate: false,
  };
}

// Generic words shared across room names — not distinctive enough to identify
// a specific room on their own (e.g. "room", "suite").
const ROOM_NAME_STOPWORDS = new Set([
  "room", "rooms", "suite", "suites", "the", "a", "an", "of", "with", "and",
]);

function roomKeywords(roomName: string): string[] {
  return roomName
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !ROOM_NAME_STOPWORDS.has(w));
}

function detectRoomType(message: string, history: ChatHistoryMessage[], roomNames: string[]): string | null {
  const source = conversationText(message, history).toLowerCase();

  // 1) Full room name appears verbatim — strongest signal.
  for (const roomName of roomNames) {
    if (source.includes(roomName.toLowerCase())) return roomName;
  }

  // 2) Distinctive-keyword overlap, so "deluxe room" / "deluxe" / "king"
  //    resolve to "Deluxe King Room". Pick the room with the most matched
  //    keywords; bail out on a tie so we ask instead of guessing wrong.
  const tokens = new Set(source.split(/[^a-z0-9]+/).filter(Boolean));
  let best: { name: string; score: number } | null = null;
  let tied = false;
  for (const roomName of roomNames) {
    const keywords = roomKeywords(roomName);
    const score = keywords.filter((kw) => tokens.has(kw)).length;
    if (score === 0) continue;
    if (!best || score > best.score) {
      best = { name: roomName, score };
      tied = false;
    } else if (score === best.score) {
      tied = true;
    }
  }
  if (best && !tied) return best.name;

  return null;
}

// Words that should never be captured as part of a name (they signal the
// guest moved on to another detail in the same sentence).
const NAME_STOPWORDS = /\b(and|my|phone|number|email|mail|tel|mobile|cell|contact|is|at|on|for|from|to|the|a|please|book|reserve|room|suite|night|nights|check)\b/i;

function cleanName(raw: string): string | undefined {
  let name = raw.trim();
  // Cut the name at the first stopword — "John Smith and my number" → "John Smith"
  const stop = name.search(NAME_STOPWORDS);
  if (stop > 0) name = name.slice(0, stop).trim();
  // Strip trailing punctuation/connectors
  name = name.replace(/[,;.\s]+$/, "").trim();
  // Reasonable name: 1–4 words, each starting with a letter
  if (!name || name.length < 2) return undefined;
  const words = name.split(/\s+/);
  if (words.length > 4) return undefined;
  return name;
}

function extractPhone(source: string): string | undefined {
  // Strip date-like tokens first so ISO dates (2026-07-01) and slash dates
  // (07/01/2026) are never mistaken for phone numbers.
  const cleaned = source
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, " ")
    .replace(/\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/g, " ");
  const match = cleaned.match(/(\+?\d[\d\s\-()]{6,}\d)/);
  if (!match) return undefined;
  const candidate = match[1].replace(/\s+/g, " ").trim();
  // A real phone has 7–15 digits
  const digitCount = (candidate.match(/\d/g) ?? []).length;
  if (digitCount < 7 || digitCount > 15) return undefined;
  return candidate;
}

export function extractGuestDetails(message: string, history: ChatHistoryMessage[]) {
  const source = conversationText(message, history);
  const emailMatch = source.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/);

  // Strong prefixes are unambiguous — accept any case ("my name is john").
  const strongName = source.match(
    /\b(?:my name is|name is|name'?s|i am|i'm|this is|it's|its|call me|booking for|reservation for|under the name)\s+([A-Za-z][A-Za-z\s.'-]{1,60})/i
  );
  // Weak prefixes ("for X", "under X") are ambiguous ("for two nights"), so
  // require a Capitalized word to reduce false positives.
  const weakName = source.match(/\b(?:for|under)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z'.-]+){0,2})/);
  let guestName = strongName?.[1]
    ? cleanName(strongName[1])
    : weakName?.[1]
      ? cleanName(weakName[1])
      : undefined;

  // Fallback: a bare "Firstname Lastname" at the START of the current message,
  // e.g. "John Carter, 5551234567" or just "John Carter". Excludes room-name
  // words to avoid capturing "Deluxe King Room" as a guest name.
  if (!guestName) {
    const ROOM_WORDS = /\b(room|suite|deluxe|king|queen|standard|penthouse|villa|double|single|twin|grand|royal)\b/i;
    const lead = message.trim().match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z'.-]+){1,2})\b/);
    if (lead?.[1] && !ROOM_WORDS.test(lead[1])) {
      const wholeIsName = /^[A-Z][a-z]+(?:\s+[A-Z][a-z'.-]+){1,2}[\s,]*$/.test(message.trim());
      const hasPhone = /\d{7,}/.test(message.replace(/[\s\-()]/g, ""));
      if (wholeIsName || hasPhone) guestName = cleanName(lead[1]);
    }
  }

  return {
    guestName,
    guestPhone: extractPhone(source),
    guestEmail: emailMatch?.[0]?.trim(),
  };
}

function extractBookingId(message: string, history: ChatHistoryMessage[]): string | null {
  const source = fullConversationText(message, history);
  const uuid = source.match(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i);
  if (uuid) return uuid[0];
  const shortId = source.match(/\b(?:booking|confirmation|reference)\s*(?:id|#|:)?\s*([0-9a-f]{8})\b/i);
  if (shortId) return shortId[1];
  const bare = source.match(/\b#?([0-9a-f]{8})\b/i);
  return bare?.[1] ?? null;
}

function extractRequestedRooms(message: string, history: ChatHistoryMessage[]): number {
  // Strip dates first so "2026-07-06" can't bleed "06" into the room count.
  const source = conversationText(message, history)
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, " ")
    .replace(/\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/g, " ");
  // "2 rooms", "2 suites", or "2 Deluxe King Rooms" (number + up to 3 words + room/suite)
  const match =
    source.match(/\b([1-9]\d?)\s+(?:[a-z]+\s+){0,3}(?:rooms?|suites?)\b/i) ||
    source.match(/\b([1-9]\d?)\s*(?:rooms?|suites?)\b/i);
  const n = Number(match?.[1] || 1) || 1;
  return Math.max(1, Math.min(20, n));
}

async function resolveBookingRecord(
  message: string,
  history: ChatHistoryMessage[],
  guestProfile?: GuestProfile
) {
  const bookingId = extractBookingId(message, history);
  if (bookingId) {
    if (bookingId.length === 8) {
      const match = await bookings.findByIdPrefix(bookingId);
      if (match) return match;
    } else {
      const found = await bookings.getById(bookingId);
      if (found?.status === "confirmed") return found;
    }
  }

  if (guestProfile?.id) {
    const guestBookings = await bookings.listByGuestId(guestProfile.id, 5);
    const upcoming = guestBookings.find((b) => b.status === "confirmed");
    if (upcoming) return upcoming;
  }

  return undefined;
}

function toSummary(booking: {
  id: string;
  room_type: string;
  check_in: string;
  check_out: string;
  rooms: number;
  guest_name: string;
  guest_phone: string;
  guest_email?: string | null;
  status: string;
}): BookingSummary {
  return {
    id: booking.id,
    roomType: booking.room_type,
    checkIn: booking.check_in,
    checkOut: booking.check_out,
    rooms: booking.rooms,
    guestName: booking.guest_name,
    guestPhone: booking.guest_phone,
    guestEmail: booking.guest_email,
    status: booking.status,
  };
}

function serializeBookingReply(input: {
  hotelName: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  guestName: string;
  bookingId: string;
  action?: "confirmed" | "cancelled" | "modified";
  totalCost?: string;
}): string {
  const shortId = input.bookingId.slice(0, 8).toUpperCase();
  const costSuffix = input.totalCost ? ` Total: ${input.totalCost}.` : "";
  if (input.action === "cancelled") {
    return `Your booking #${shortId} has been cancelled. We hope to welcome you another time.`;
  }
  if (input.action === "modified") {
    return `Done — booking #${shortId} is updated: ${input.rooms} ${input.roomType} room(s) from ${input.checkIn} to ${input.checkOut} for ${input.guestName}.${costSuffix}`;
  }
  return `You're all set! Booking #${shortId} is confirmed at ${input.hotelName}: ${input.rooms} ${input.roomType} room(s) from ${input.checkIn} to ${input.checkOut} for ${input.guestName}.${costSuffix} A confirmation has been sent if we have your email.`;
}

async function handleFindAvailableDates(
  message: string,
  history: ChatHistoryMessage[],
  config: HotelConfig
): Promise<BookingFlowResult> {
  const roomNames = config.rooms.map((r) => r.name);
  const roomType = detectRoomType(message, history, roomNames);

  // Try to extract desired stay length from message
  const nightsMatch = conversationText(message, history).match(/\b(\d+)\s*(?:night|nights|day|days)\b/i);
  const stayNights = nightsMatch ? Math.min(30, Math.max(1, Number(nightsMatch[1]))) : 2;

  if (roomType) {
    const windows = await findNextAvailableWindows(config, roomType, stayNights, { maxResults: 3 });
    return { handled: true, reply: formatAvailableWindows(roomType, windows, stayNights), escalate: false };
  }

  // No room specified — check all room types for 1 night
  const snapshot = await getAvailabilitySnapshot(config, new Date().toISOString().slice(0, 10),
    (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })()
  );
  const available = snapshot.filter((r) => r.available > 0);
  if (!available.length) {
    return {
      handled: true,
      reply: "We're fully booked tonight. Which room type and dates are you looking at? I can check upcoming availability.",
      escalate: false,
    };
  }
  const list = available.map((r) => `${r.roomType} (${r.available} rooms, ${r.currency}${r.pricePerNight}/night)`).join("; ");
  return {
    handled: true,
    reply: `We have availability right now: ${list}. Which room type interests you, and how many nights are you thinking?`,
    escalate: false,
  };
}

async function handleAvailabilityQuery(
  message: string,
  history: ChatHistoryMessage[],
  config: HotelConfig
): Promise<BookingFlowResult> {
  const dateRange = detectDateRange(message, history);
  if (dateRange.parseFailed) {
    return {
      handled: true,
      reply: "I'd love to check availability — could you share your check-in and check-out dates?",
      escalate: false,
    };
  }
  if (!dateRange.checkIn || !dateRange.checkOut) {
    if (dateRange.checkIn && dateRange.needsClarification) {
      return {
        handled: true,
        reply: `Got ${dateRange.checkIn} — how many nights will you be staying, or what's your check-out date?`,
        escalate: false,
      };
    }
    return {
      handled: true,
      reply: "Which dates should I check? Share check-in and check-out (for example, 2026-06-10 to 2026-06-12).",
      escalate: false,
    };
  }

  const snapshot = await getAvailabilitySnapshot(config, dateRange.checkIn, dateRange.checkOut);
  const roomType = detectRoomType(message, history, config.rooms.map((r) => r.name));
  if (roomType) {
    const row = snapshot.find((r) => r.roomType === roomType);
    if (!row || row.available <= 0) {
      const alternatives = await suggestAlternatives(config, dateRange.checkIn, dateRange.checkOut, roomType);
      return {
        handled: true,
        reply: `The ${roomType} isn't available ${dateRange.checkIn} to ${dateRange.checkOut}. ${formatAlternativeSuggestions(alternatives)}`,
        escalate: false,
      };
    }
    return {
      handled: true,
      reply: `Yes — we have ${row.available} ${roomType} room(s) available ${dateRange.checkIn} to ${dateRange.checkOut} at ${row.currency}${row.pricePerNight}/night. Would you like me to book that for you?`,
      escalate: false,
    };
  }

  return {
    handled: true,
    reply: formatAvailabilityList(snapshot, dateRange.checkIn, dateRange.checkOut),
    escalate: false,
  };
}

async function handleCancel(
  message: string,
  history: ChatHistoryMessage[],
  config: HotelConfig,
  guestProfile?: GuestProfile
): Promise<BookingFlowResult> {
  const record = await resolveBookingRecord(message, history, guestProfile);
  if (!record) {
    return {
      handled: true,
      reply: "I can cancel that for you — please share your booking confirmation number (first 8 characters) or sign in so I can find your reservation.",
      escalate: false,
    };
  }

  const result = await cancelBookingSafe(record.id, { guestId: guestProfile?.id });
  if (!result.ok) {
    return {
      handled: true,
      reply: result.error,
      escalate: result.status >= 500,
      reason: result.status >= 500 ? "ai_error" : undefined,
    };
  }

  notifyBookingComplete(result.booking, "cancelled", message);

  return {
    handled: true,
    reply: serializeBookingReply({
      hotelName: config.branding.hotelName,
      roomType: result.booking.room_type,
      checkIn: result.booking.check_in,
      checkOut: result.booking.check_out,
      rooms: result.booking.rooms,
      guestName: result.booking.guest_name,
      bookingId: result.booking.id,
      action: "cancelled",
    }),
    booking: toSummary(result.booking),
    escalate: false,
  };
}

async function handleModify(
  message: string,
  history: ChatHistoryMessage[],
  config: HotelConfig,
  guestProfile?: GuestProfile
): Promise<BookingFlowResult> {
  const record = await resolveBookingRecord(message, history, guestProfile);
  if (!record) {
    return {
      handled: true,
      reply: "Happy to update your reservation — share your booking ID or sign in, plus the new dates or room type you'd like.",
      escalate: false,
    };
  }

  const dateRange = detectDateRange(message, history);
  const roomType = detectRoomType(message, history, config.rooms.map((r) => r.name));
  const rooms = extractRequestedRooms(message, history);

  if (!dateRange.checkIn && !dateRange.checkOut && !roomType) {
    return {
      handled: true,
      reply: `I found booking #${record.id.slice(0, 8).toUpperCase()} (${record.room_type}, ${record.check_in} to ${record.check_out}). What would you like to change — dates or room type?`,
      escalate: false,
    };
  }

  const result = await modifyBookingSafe(
    record.id,
    {
      roomType: roomType ?? undefined,
      checkIn: dateRange.checkIn,
      checkOut: dateRange.checkOut,
      rooms: rooms !== 1 ? rooms : undefined,
    },
    { guestId: guestProfile?.id }
  );

  if (!result.ok) {
    if (result.status === 409) {
      const alternatives = await suggestAlternatives(
        config,
        dateRange.checkIn ?? record.check_in,
        dateRange.checkOut ?? record.check_out,
        roomType ?? record.room_type
      );
      return {
        handled: true,
        reply: `Those dates aren't available for that room. ${formatAlternativeSuggestions(alternatives)}`,
        escalate: false,
      };
    }
    return {
      handled: true,
      reply: result.error,
      escalate: result.status >= 500,
      reason: result.status >= 500 ? "ai_error" : undefined,
    };
  }

  notifyBookingComplete(result.booking, "modified", message);

  const modifiedPending: PendingBooking = {
    roomType: result.booking.room_type,
    checkIn: result.booking.check_in,
    checkOut: result.booking.check_out,
    rooms: result.booking.rooms,
    guestName: result.booking.guest_name,
    guestPhone: result.booking.guest_phone,
    guestEmail: result.booking.guest_email,
  };
  const modCost = calculateStayCost(modifiedPending, config, guestProfile);
  const modTotalCost = modCost ? formatCost(modCost.total, modCost.currency) : undefined;

  return {
    handled: true,
    reply: serializeBookingReply({
      hotelName: config.branding.hotelName,
      roomType: result.booking.room_type,
      checkIn: result.booking.check_in,
      checkOut: result.booking.check_out,
      rooms: result.booking.rooms,
      guestName: result.booking.guest_name,
      bookingId: result.booking.id,
      action: "modified",
      totalCost: modTotalCost,
    }),
    booking: toSummary(result.booking),
    escalate: false,
  };
}

async function handleNewBooking(
  message: string,
  history: ChatHistoryMessage[],
  config: HotelConfig,
  guestProfile?: GuestProfile
): Promise<BookingFlowResult> {
  const roomNames = config.rooms.map((room) => room.name);
  const roomType = detectRoomType(message, history, roomNames);
  const dateRange = detectDateRange(message, history);

  if (dateRange.parseFailed) {
    return {
      handled: true,
      reply: "I want to get your dates right — could you share your check-in and check-out dates? You can say something like \"next Friday for two nights\" or give me the exact dates.",
      escalate: false,
    };
  }

  // Reject past dates before doing anything else
  if (dateRange.checkIn && dateRange.checkIn < todayIsoDate()) {
    return {
      handled: true,
      reply: `It looks like ${dateRange.checkIn} is in the past. What dates are you looking at for your stay?`,
      escalate: false,
    };
  }

  if (!dateRange.checkIn || !dateRange.checkOut) {
    if (dateRange.checkIn && dateRange.needsClarification) {
      return {
        handled: true,
        reply: `Got it — arriving ${dateRange.checkIn}. How many nights will you be staying, or what's your check-out date?`,
        escalate: false,
      };
    }
    // Vary the wording so the same phrase never fires twice in a row
    const askDatesReplies = [
      "I'd be happy to book that for you. What are your check-in and check-out dates?",
      "Sure, let's get that sorted. Which dates were you thinking for check-in and check-out?",
      "Happy to help — could you share your arrival and departure dates?",
      "Of course! What dates work for your stay — check-in and check-out?",
    ];
    return {
      handled: true,
      reply: askDatesReplies[message.length % askDatesReplies.length],
      escalate: false,
    };
  }

  const snapshot = await getAvailabilitySnapshot(config, dateRange.checkIn, dateRange.checkOut);

  if (!roomType) {
    const availableRooms = snapshot.filter((item) => item.available > 0);
    if (!availableRooms.length) {
      const alternatives = await suggestAlternatives(config, dateRange.checkIn, dateRange.checkOut);
      return {
        handled: true,
        reply: `We're fully booked ${dateRange.checkIn} to ${dateRange.checkOut}. ${formatAlternativeSuggestions(alternatives)}`,
        escalate: false,
      };
    }
    const list = availableRooms
      .slice(0, 5)
      .map((item) => `${item.roomType} (${item.available} left, ${item.currency}${item.pricePerNight}/night)`)
      .join(", ");
    return {
      handled: true,
      reply: `For ${dateRange.checkIn} to ${dateRange.checkOut}, we have: ${list}. Which room type would you like?`,
      escalate: false,
    };
  }

  const selected = snapshot.find((item) => item.roomType === roomType);
  if (!selected || selected.available <= 0) {
    const alternatives = await suggestAlternatives(config, dateRange.checkIn, dateRange.checkOut, roomType);
    return {
      handled: true,
      reply: `The ${roomType} isn't available those dates. ${formatAlternativeSuggestions(alternatives)}`,
      escalate: false,
    };
  }

  const requestedRooms = extractRequestedRooms(message, history);
  if (selected.available < requestedRooms) {
    return {
      handled: true,
      reply: `Only ${selected.available} ${roomType} room(s) are free for those dates. Would you like ${selected.available} room(s), or should I check another type?`,
      escalate: false,
    };
  }

  const details = extractGuestDetails(message, history);
  const guestName = details.guestName || guestProfile?.name;
  const guestPhone = details.guestPhone || guestProfile?.phone || undefined;
  const guestEmail = details.guestEmail || guestProfile?.email;

  if (!guestName || !guestPhone) {
    return {
      handled: true,
      reply: `Great — ${roomType} is available ${dateRange.checkIn} to ${dateRange.checkOut}. To confirm, I just need your full name and phone number.`,
      escalate: false,
    };
  }

  const note = extractSpecialRequestNote(message);
  const pending: PendingBooking = {
    roomType,
    checkIn: dateRange.checkIn,
    checkOut: dateRange.checkOut,
    rooms: requestedRooms,
    guestName,
    guestPhone,
    guestEmail,
    specialRequests: note,
  };

  return buildConfirmationResponse(pending, config);
}

const BOOKING_CONTEXT_RE = /\b(book|reserv|check-in|check-out|room type|confirmation|available)\b/i;

export function shouldRunBookingFlow(
  message: string,
  history: ChatHistoryMessage[],
  langCode: string,
  roomNames: string[] = [],
  pendingBooking?: PendingBooking | null
): boolean {
  if (pendingBooking && !isTopicEscape(message)) return true;
  if (isAffirmative(message) || isNegative(message)) {
    const recent = history.slice(-2);
    if (recent.some((h) => /\b(confirm|just to confirm|reply yes)\b/i.test(h.content))) return true;
  }
  if (isSpecialRequestIntent(message)) return true;
  if (isCancelIntent(message) || isModifyIntent(message)) return true;
  if (isAvailabilityIntent(message, langCode)) return true;
  if (isFindAvailableDatesIntent(message)) return true;
  if (isBookingIntent(message, langCode)) return true;

  const recent = history.slice(-4);
  if (!recent.some((h) => BOOKING_CONTEXT_RE.test(h.content))) return false;

  const details = extractGuestDetails(message, history);
  return Boolean(
    detectDateRange(message, history).checkIn ||
      detectRoomType(message, history, roomNames) ||
      details.guestName ||
      details.guestPhone
  );
}

export async function handleGuestBookingFlow(params: {
  message: string;
  langCode: string;
  config: HotelConfig;
  history: ChatHistoryMessage[];
  guestProfile?: GuestProfile;
  pendingBooking?: PendingBooking | null;
}): Promise<BookingFlowResult> {
  const { message, langCode, config, history, guestProfile, pendingBooking } = params;

  if (pendingBooking) {
    return handlePendingBookingConfirmation(message, history, pendingBooking, config, guestProfile);
  }

  if (isSpecialRequestIntent(message)) {
    return handleSpecialRequest(message, history, config, guestProfile);
  }

  if (isCancelIntent(message)) {
    return handleCancel(message, history, config, guestProfile);
  }

  if (isModifyIntent(message)) {
    return handleModify(message, history, config, guestProfile);
  }

  if (isAvailabilityIntent(message, langCode)) {
    return handleAvailabilityQuery(message, history, config);
  }

  if (isFindAvailableDatesIntent(message)) {
    return handleFindAvailableDates(message, history, config);
  }

  if (isBookingIntent(message, langCode)) {
    return handleNewBooking(message, history, config, guestProfile);
  }

  const inBookingContext =
    history.slice(-4).some((h) => BOOKING_CONTEXT_RE.test(h.content)) &&
    (detectDateRange(message, history).checkIn ||
      detectRoomType(message, history, config.rooms.map((r) => r.name)) ||
      extractGuestDetails(message, history).guestName ||
      extractGuestDetails(message, history).guestPhone);

  if (inBookingContext) {
    return handleNewBooking(message, history, config, guestProfile);
  }

  return { handled: false };
}
