import type { EscalationReason } from "@/lib/escalation";
import type { HotelConfig } from "@/lib/hotelConfig";
import { detectDateRange, type ChatHistoryMessage } from "@/lib/dateParsing";
import { getKeywordsForLanguage } from "@/lib/languages";
import {
  createDiningReservationSafe,
  toDiningSummary,
  type DiningReservationSummary,
} from "@/lib/diningReservationService";
import {
  detectPartySize,
  detectReservationTime,
  formatReservationTime,
  parseVenueHours,
} from "@/lib/timeParsing";
import { todayIsoDate } from "@/lib/dateParsing";
import { isAffirmative, isNegative, extractGuestDetails } from "@/lib/bookingFlow";

export type { DiningReservationSummary as DiningSummary };

export type PendingDining = {
  venueName: string;
  reservationDate: string;
  reservationTime: string;
  partySize: number;
  guestName: string;
  guestPhone: string;
  guestEmail?: string | null;
  specialRequests?: string | null;
};

export type DiningFlowResult = {
  handled: boolean;
  reply?: string;
  escalate?: boolean;
  reason?: EscalationReason;
  dining?: DiningReservationSummary;
  pendingDining?: PendingDining | null;
};

type GuestProfile = { id: string; name: string; phone: string | null; email: string };

function conversationText(message: string, history: ChatHistoryMessage[]): string {
  // Guest-authored text only — see bookingFlow.conversationText for rationale.
  const userHistory = history.filter((h) => h.role === "user");
  return `${userHistory.map((h) => h.content).join(" ")} ${message}`;
}

function detectVenue(message: string, history: ChatHistoryMessage[], venueNames: string[]): string | null {
  const source = conversationText(message, history).toLowerCase();
  for (const name of venueNames) {
    if (source.includes(name.toLowerCase())) return name;
  }
  return null;
}

function extractSpecialNote(message: string): string | null {
  const match = message.match(/\b(?:note|request|allerg|window|birthday|anniversary)[:—-]?\s*(.+)/i);
  return match?.[1]?.trim().slice(0, 500) || null;
}

export function isDiningReservationIntent(message: string, langCode: string): boolean {
  const lower = message.toLowerCase();
  if (/\b(hours|menu only|what time does|when does)\b/i.test(lower) && !/\b(book|reserve|table)\b/i.test(lower)) {
    return false;
  }
  const diningKeywords = getKeywordsForLanguage(langCode).dining;
  const hasDiningKw = diningKeywords.some((kw) => lower.includes(kw.toLowerCase()));
  if (/\b(table for|book a table|reserve a table|dinner reservation|lunch reservation)\b/i.test(lower)) {
    return true;
  }
  return (
    /\b(book|reserve|reservation|hold)\b/i.test(lower) &&
    (hasDiningKw || /\b(table|restaurant|dining|dinner|lunch|breakfast|meal|café|cafe)\b/i.test(lower))
  );
}

function buildDiningConfirmation(pending: PendingDining, config: HotelConfig): DiningFlowResult {
  const timeLabel = formatReservationTime(pending.reservationTime);
  const note = pending.specialRequests ? ` Note: ${pending.specialRequests}.` : "";
  return {
    handled: true,
    reply: `Just to confirm your table: ${pending.partySize} guests at ${pending.venueName}, ${pending.reservationDate} at ${timeLabel}, under ${pending.guestName} at ${config.branding.hotelName}.${note} Reply yes to confirm, or tell me what to change.`,
    pendingDining: pending,
    escalate: false,
  };
}

async function handlePendingDiningConfirmation(
  message: string,
  history: ChatHistoryMessage[],
  pending: PendingDining,
  config: HotelConfig,
  guestProfile?: GuestProfile
): Promise<DiningFlowResult> {
  if (isNegative(message)) {
    return {
      handled: true,
      reply: "No problem — which detail would you like to change? Venue, date, time, or party size?",
      pendingDining: null,
      escalate: false,
    };
  }

  if (isAffirmative(message)) {
    const result = await createDiningReservationSafe({
      venueName: pending.venueName,
      reservationDate: pending.reservationDate,
      reservationTime: pending.reservationTime,
      partySize: pending.partySize,
      guestName: pending.guestName,
      guestPhone: pending.guestPhone,
      guestEmail: pending.guestEmail,
      guestId: guestProfile?.id,
      specialRequests: pending.specialRequests,
    });

    if (!result.ok) {
      return {
        handled: true,
        reply: result.error,
        pendingDining: pending,
        escalate: result.status >= 500,
        reason: result.status >= 500 ? "ai_error" : undefined,
      };
    }

    const summary = toDiningSummary(result.reservation);
    const shortId = summary.id.slice(0, 8).toUpperCase();
    return {
      handled: true,
      reply: `You're all set! Table reservation #${shortId} is confirmed at ${summary.venueName} on ${summary.reservationDate} at ${formatReservationTime(summary.reservationTime)} for ${summary.partySize} guests. Our restaurant team has been notified.`,
      dining: summary,
      pendingDining: null,
      escalate: false,
    };
  }

  const venueNames = config.dining.map((v) => v.name);
  const updated: PendingDining = {
    venueName: detectVenue(message, history, venueNames) ?? pending.venueName,
    reservationDate: detectDateRange(message, history).checkIn ?? pending.reservationDate,
    reservationTime: detectReservationTime(message, history) ?? pending.reservationTime,
    partySize: detectPartySize(message, history) || pending.partySize,
    guestName: extractGuestDetails(message, history).guestName ?? pending.guestName,
    guestPhone: extractGuestDetails(message, history).guestPhone ?? pending.guestPhone,
    guestEmail: extractGuestDetails(message, history).guestEmail ?? pending.guestEmail,
    specialRequests: extractSpecialNote(message) ?? pending.specialRequests,
  };

  return buildDiningConfirmation(updated, config);
}

async function handleNewDiningReservation(
  message: string,
  history: ChatHistoryMessage[],
  config: HotelConfig,
  guestProfile?: GuestProfile
): Promise<DiningFlowResult> {
  const venueNames = config.dining.map((v) => v.name);
  if (!venueNames.length) {
    return {
      handled: true,
      reply: "We don't have restaurant reservations configured yet. I can still answer questions about nearby dining if you'd like.",
      escalate: false,
    };
  }

  const venueName = detectVenue(message, history, venueNames);
  const dateRange = detectDateRange(message, history);
  const reservationDate = dateRange.checkIn ?? dateRange.checkOut;
  const reservationTime = detectReservationTime(message, history);
  const partySize = detectPartySize(message, history);

  if (!venueName) {
    const list = config.dining
      .map((v) => `${v.name} (${v.cuisine}, ${v.hours})`)
      .join("; ");
    return {
      handled: true,
      reply: `I'd be happy to reserve a table. We have: ${list}. Which venue would you like, and what date and time?`,
      escalate: false,
    };
  }

  if (!reservationDate) {
    return {
      handled: true,
      reply: `Great choice — ${venueName}. What date would you like the reservation?`,
      escalate: false,
    };
  }

  // Reject past dates
  if (reservationDate < todayIsoDate()) {
    return {
      handled: true,
      reply: `It looks like ${reservationDate} has already passed. Which date would you like to book the table for?`,
      escalate: false,
    };
  }

  if (!reservationTime) {
    const venue = config.dining.find((v) => v.name === venueName);
    const hoursHint = venue?.hours ? ` (open ${venue.hours})` : "";
    return {
      handled: true,
      reply: `Perfect — ${venueName} on ${reservationDate}${hoursHint}. What time should I book the table for?`,
      escalate: false,
    };
  }

  // Validate time against venue operating hours
  const venueConfig = config.dining.find((v) => v.name === venueName);
  if (venueConfig?.hours) {
    const hoursCheck = parseVenueHours(venueConfig.hours, reservationTime);
    if (!hoursCheck.open) {
      return {
        handled: true,
        reply: `${venueName} isn't open at ${formatReservationTime(reservationTime)}. Their hours are: ${hoursCheck.hoursText}. What time works for you?`,
        escalate: false,
      };
    }
  }

  const details = extractGuestDetails(message, history);
  const guestName = details.guestName || guestProfile?.name;
  const guestPhone = details.guestPhone || guestProfile?.phone || undefined;
  const guestEmail = details.guestEmail || guestProfile?.email;

  if (!guestName || !guestPhone) {
    return {
      handled: true,
      reply: `Got it — table for ${partySize} at ${venueName}, ${reservationDate} at ${formatReservationTime(reservationTime)}. To confirm, I need your full name and phone number.`,
      escalate: false,
    };
  }

  const pending: PendingDining = {
    venueName,
    reservationDate,
    reservationTime,
    partySize,
    guestName,
    guestPhone,
    guestEmail,
    specialRequests: extractSpecialNote(message),
  };

  return buildDiningConfirmation(pending, config);
}

const DINING_CONTEXT_RE = /\b(table|restaurant|dining|dinner|lunch|breakfast|reservation|venue)\b/i;

export function shouldRunDiningFlow(
  message: string,
  history: ChatHistoryMessage[],
  langCode: string,
  pendingDining?: PendingDining | null
): boolean {
  if (pendingDining) return true;
  if (isAffirmative(message) || isNegative(message)) {
    const recent = history.slice(-2);
    if (recent.some((h) => /\b(table|dining|just to confirm your table)\b/i.test(h.content))) return true;
  }
  if (isDiningReservationIntent(message, langCode)) return true;

  const recent = history.slice(-4);
  if (!recent.some((h) => DINING_CONTEXT_RE.test(h.content))) return false;

  return Boolean(
    detectReservationTime(message, history) ||
      detectDateRange(message, history).checkIn ||
      detectPartySize(message, history) > 2 ||
      extractGuestDetails(message, history).guestName
  );
}

export async function handleDiningFlow(params: {
  message: string;
  langCode: string;
  config: HotelConfig;
  history: ChatHistoryMessage[];
  guestProfile?: GuestProfile;
  pendingDining?: PendingDining | null;
}): Promise<DiningFlowResult> {
  const { message, langCode, config, history, guestProfile, pendingDining } = params;

  if (pendingDining) {
    return handlePendingDiningConfirmation(message, history, pendingDining, config, guestProfile);
  }

  if (isDiningReservationIntent(message, langCode)) {
    return handleNewDiningReservation(message, history, config, guestProfile);
  }

  const inDiningContext =
    history.slice(-4).some((h) => DINING_CONTEXT_RE.test(h.content)) &&
    (detectReservationTime(message, history) ||
      detectDateRange(message, history).checkIn ||
      extractGuestDetails(message, history).guestName);

  if (inDiningContext) {
    return handleNewDiningReservation(message, history, config, guestProfile);
  }

  return { handled: false };
}
