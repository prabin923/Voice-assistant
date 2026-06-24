import type { EscalationReason } from "@/lib/escalation";
import type { HotelConfig } from "@/lib/hotelConfig";
import type { ChatHistoryMessage } from "@/lib/dateParsing";
import {
  handleGuestBookingFlow,
  shouldRunBookingFlow,
  isFindAvailableDatesIntent,
  isTopicEscape,
  type BookingSummary,
  type PendingBooking,
} from "@/lib/bookingFlow";
import {
  handleDiningFlow,
  shouldRunDiningFlow,
  type DiningSummary,
  type PendingDining,
} from "@/lib/diningFlow";

export type { BookingSummary, PendingBooking, DiningSummary, PendingDining };

export type GuestServiceFlowResult = {
  handled: boolean;
  reply?: string;
  escalate?: boolean;
  reason?: EscalationReason;
  booking?: BookingSummary;
  dining?: DiningSummary;
  pendingBooking?: PendingBooking | null;
  pendingDining?: PendingDining | null;
};

export function shouldRunGuestServiceFlow(
  message: string,
  history: ChatHistoryMessage[],
  langCode: string,
  roomNames: string[] = [],
  pendingBooking?: PendingBooking | null,
  pendingDining?: PendingDining | null
): boolean {
  return (
    shouldRunBookingFlow(message, history, langCode, roomNames, pendingBooking) ||
    shouldRunDiningFlow(message, history, langCode, pendingDining) ||
    isFindAvailableDatesIntent(message)
  );
}

/** Autonomous room + dining reservations and booking management. */
export async function handleGuestServiceFlow(params: {
  message: string;
  langCode: string;
  config: HotelConfig;
  history: ChatHistoryMessage[];
  guestProfile?: { id: string; name: string; phone: string | null; email: string };
  pendingBooking?: PendingBooking | null;
  pendingDining?: PendingDining | null;
}): Promise<GuestServiceFlowResult> {
  const { message, langCode, config, history, guestProfile, pendingBooking, pendingDining } = params;

  // Mid-booking topic escape (directions, parking, amenities): let the AI answer
  // the question and preserve the in-flight booking/dining so the guest can resume.
  if ((pendingBooking || pendingDining) && isTopicEscape(message)) {
    return {
      handled: false,
      pendingBooking: pendingBooking ?? null,
      pendingDining: pendingDining ?? null,
    };
  }

  if (pendingBooking && !isTopicEscape(message)) {
    const booking = await handleGuestBookingFlow({
      message,
      langCode,
      config,
      history,
      guestProfile,
      pendingBooking,
    });
    if (booking.handled) return { ...booking, pendingDining: null };
  }

  if (pendingDining) {
    const dining = await handleDiningFlow({
      message,
      langCode,
      config,
      history,
      guestProfile,
      pendingDining,
    });
    return { ...dining, pendingBooking: null };
  }

  if (shouldRunDiningFlow(message, history, langCode)) {
    const dining = await handleDiningFlow({
      message,
      langCode,
      config,
      history,
      guestProfile,
    });
    if (dining.handled) return dining;
  }

  if (shouldRunBookingFlow(message, history, langCode, config.rooms.map((r) => r.name))) {
    const booking = await handleGuestBookingFlow({
      message,
      langCode,
      config,
      history,
      guestProfile,
    });
    if (booking.handled) return booking;
  }

  return { handled: false };
}
