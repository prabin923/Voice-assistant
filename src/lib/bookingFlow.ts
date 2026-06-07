import type { EscalationReason } from "@/lib/escalation";
import type { HotelConfig } from "@/lib/hotelConfig";
import { bookings } from "@/lib/db";
import {
  cancelBookingSafe,
  createBookingSafe,
  modifyBookingSafe,
  sendBookingEmailIfNeeded,
} from "@/lib/bookingService";
import { notifyStaffBookingComplete } from "@/lib/staffNotifications";
import {
  formatAlternativeSuggestions,
  formatAvailabilityList,
  getAvailabilitySnapshot,
  suggestAlternatives,
} from "@/lib/availabilityQuery";
import { detectDateRange, type ChatHistoryMessage } from "@/lib/dateParsing";
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

export type BookingFlowResult = {
  handled: boolean;
  reply?: string;
  escalate?: boolean;
  reason?: EscalationReason;
  booking?: BookingSummary;
};

type GuestProfile = { id: string; name: string; phone: string | null; email: string };

function conversationText(message: string, history: ChatHistoryMessage[]): string {
  return `${history.map((h) => h.content).join(" ")} ${message}`;
}

function matchesIntent(message: string, langCode: string, extra: string[]): boolean {
  const lower = message.toLowerCase();
  const keywords = getKeywordsForLanguage(langCode).booking;
  return [...keywords, ...extra].some((kw) => lower.includes(kw.toLowerCase()));
}

export function isBookingIntent(message: string, langCode: string): boolean {
  if (isCancelIntent(message) || isModifyIntent(message)) return false;
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

function detectRoomType(message: string, history: ChatHistoryMessage[], roomNames: string[]): string | null {
  const source = conversationText(message, history).toLowerCase();
  for (const roomName of roomNames) {
    if (source.includes(roomName.toLowerCase())) return roomName;
  }
  return null;
}

function extractGuestDetails(message: string, history: ChatHistoryMessage[]) {
  const source = conversationText(message, history);
  const emailMatch = source.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/);
  const phoneMatch = source.match(/(\+?\d[\d\s\-()]{7,}\d)/);
  const nameMatch = source.match(/\b(?:my name is|name is|i am|this is)\s+([A-Za-z][A-Za-z\s.'-]{1,60})/i);
  return {
    guestName: nameMatch?.[1]?.trim(),
    guestPhone: phoneMatch?.[1]?.replace(/\s+/g, " ").trim(),
    guestEmail: emailMatch?.[0]?.trim(),
  };
}

function extractBookingId(message: string, history: ChatHistoryMessage[]): string | null {
  const source = conversationText(message, history);
  const uuid = source.match(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i);
  if (uuid) return uuid[0];
  const shortId = source.match(/\b(?:booking|confirmation|reference)\s*(?:id|#|:)?\s*([0-9a-f]{8})\b/i);
  if (shortId) return shortId[1];
  const bare = source.match(/\b#?([0-9a-f]{8})\b/i);
  return bare?.[1] ?? null;
}

function extractRequestedRooms(message: string, history: ChatHistoryMessage[]): number {
  const source = conversationText(message, history);
  const match = source.match(/\b(\d+)\s*(?:rooms?|room)\b/i);
  return Math.max(1, Number(match?.[1] || 1) || 1);
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
}): string {
  const shortId = input.bookingId.slice(0, 8).toUpperCase();
  if (input.action === "cancelled") {
    return `Your booking #${shortId} has been cancelled. We hope to welcome you another time.`;
  }
  if (input.action === "modified") {
    return `Done — booking #${shortId} is updated: ${input.rooms} ${input.roomType} room(s) from ${input.checkIn} to ${input.checkOut} for ${input.guestName}.`;
  }
  return `You're all set! Booking #${shortId} is confirmed at ${input.hotelName}: ${input.rooms} ${input.roomType} room(s) from ${input.checkIn} to ${input.checkOut} for ${input.guestName}. A confirmation has been sent if we have your email.`;
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

  void notifyStaffBookingComplete({
    hotelName: config.branding.hotelName,
    action: "cancelled",
    booking: result.booking,
    guestMessage: message,
  });

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

  sendBookingEmailIfNeeded(result.booking);
  void notifyStaffBookingComplete({
    hotelName: config.branding.hotelName,
    action: "modified",
    booking: result.booking,
    guestMessage: message,
  });

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
      reply: "I want to get your dates right — could you share check-in and check-out? For example, June 10 to June 12, or 2026-06-10 to 2026-06-12.",
      escalate: false,
    };
  }

  if (!dateRange.checkIn || !dateRange.checkOut) {
    if (dateRange.checkIn && dateRange.needsClarification) {
      return {
        handled: true,
        reply: `Perfect — starting ${dateRange.checkIn}. How many nights, or what's your check-out date?`,
        escalate: false,
      };
    }
    return {
      handled: true,
      reply: "I'd be happy to book that for you. What are your check-in and check-out dates?",
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

  const bookingResult = await createBookingSafe({
    roomType,
    checkIn: dateRange.checkIn,
    checkOut: dateRange.checkOut,
    rooms: requestedRooms,
    guestName,
    guestPhone,
    guestEmail,
    guestId: guestProfile?.id,
  });

  if (!bookingResult.ok) {
    if (bookingResult.status === 409) {
      const alternatives = await suggestAlternatives(config, dateRange.checkIn, dateRange.checkOut, roomType);
      return {
        handled: true,
        reply: `That room just became unavailable. ${formatAlternativeSuggestions(alternatives)}`,
        escalate: false,
      };
    }
    return {
      handled: true,
      reply: "I couldn't complete the booking just now. Please try again in a moment, or ask to speak with our team if it keeps failing.",
      escalate: bookingResult.status >= 500,
      reason: bookingResult.status >= 500 ? "ai_error" : undefined,
    };
  }

  const booking = bookingResult.booking;
  sendBookingEmailIfNeeded(booking);
  void notifyStaffBookingComplete({
    hotelName: config.branding.hotelName,
    action: "confirmed",
    booking,
    guestMessage: message,
  });

  return {
    handled: true,
    reply: serializeBookingReply({
      hotelName: config.branding.hotelName,
      roomType,
      checkIn: booking.check_in,
      checkOut: booking.check_out,
      rooms: booking.rooms,
      guestName: booking.guest_name,
      bookingId: booking.id,
    }),
    booking: toSummary(booking),
    escalate: false,
  };
}

const BOOKING_CONTEXT_RE = /\b(book|reserv|check-in|check-out|room type|confirmation|available)\b/i;

export function shouldRunBookingFlow(
  message: string,
  history: ChatHistoryMessage[],
  langCode: string,
  roomNames: string[] = []
): boolean {
  if (isCancelIntent(message) || isModifyIntent(message)) return true;
  if (isAvailabilityIntent(message, langCode)) return true;
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
}): Promise<BookingFlowResult> {
  const { message, langCode, config, history, guestProfile } = params;

  if (isCancelIntent(message)) {
    return handleCancel(message, history, config, guestProfile);
  }

  if (isModifyIntent(message)) {
    return handleModify(message, history, config, guestProfile);
  }

  if (isAvailabilityIntent(message, langCode)) {
    return handleAvailabilityQuery(message, history, config);
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
