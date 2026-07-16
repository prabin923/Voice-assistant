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
import {
  handleSpaFlow,
  shouldRunSpaFlow,
  isSpaIntent,
  type SpaSummary,
  type PendingSpa,
} from "@/lib/spaFlow";
import {
  handleServiceRequestFlow,
  isServiceRequestIntent,
  type PendingServiceRequest,
} from "@/lib/serviceRequestFlow";

export type { BookingSummary, PendingBooking, DiningSummary, PendingDining, SpaSummary, PendingSpa, PendingServiceRequest };

export type GuestServiceFlowResult = {
  handled: boolean;
  reply?: string;
  escalate?: boolean;
  reason?: EscalationReason;
  booking?: BookingSummary;
  dining?: DiningSummary;
  spa?: SpaSummary;
  serviceRequest?: { id: string; type: string; description: string; status: string };
  pendingBooking?: PendingBooking | null;
  pendingDining?: PendingDining | null;
  pendingSpa?: PendingSpa | null;
  pendingServiceRequest?: PendingServiceRequest | null;
};

export function shouldRunGuestServiceFlow(
  message: string,
  history: ChatHistoryMessage[],
  langCode: string,
  roomNames: string[] = [],
  pendingBooking?: PendingBooking | null,
  pendingDining?: PendingDining | null,
  pendingSpa?: PendingSpa | null,
  pendingServiceRequest?: PendingServiceRequest | null
): boolean {
  return (
    shouldRunBookingFlow(message, history, langCode, roomNames, pendingBooking) ||
    shouldRunDiningFlow(message, history, langCode, pendingDining) ||
    shouldRunSpaFlow(message, history, langCode, pendingSpa) ||
    isFindAvailableDatesIntent(message) ||
    isServiceRequestIntent(message) ||
    Boolean(pendingServiceRequest)
  );
}

/** Autonomous room + dining + spa reservations, service requests, and booking management. */
export async function handleGuestServiceFlow(params: {
  message: string;
  langCode: string;
  config: HotelConfig;
  history: ChatHistoryMessage[];
  guestProfile?: { id: string; name: string; phone: string | null; email: string };
  pendingBooking?: PendingBooking | null;
  pendingDining?: PendingDining | null;
  pendingSpa?: PendingSpa | null;
  pendingServiceRequest?: PendingServiceRequest | null;
}): Promise<GuestServiceFlowResult> {
  const { message, langCode, config, history, guestProfile, pendingBooking, pendingDining, pendingSpa, pendingServiceRequest } = params;

  // Mid-booking topic escape (directions, parking, amenities): let the AI answer
  // the question and preserve the in-flight booking/dining so the guest can resume.
  if ((pendingBooking || pendingDining || pendingSpa) && isTopicEscape(message)) {
    return {
      handled: false,
      pendingBooking: pendingBooking ?? null,
      pendingDining: pendingDining ?? null,
      pendingSpa: pendingSpa ?? null,
      pendingServiceRequest: pendingServiceRequest ?? null,
    };
  }

  // Continue pending booking
  if (pendingBooking && !isTopicEscape(message)) {
    const booking = await handleGuestBookingFlow({
      message,
      langCode,
      config,
      history,
      guestProfile,
      pendingBooking,
    });
    if (booking.handled) return { ...booking, pendingDining: null, pendingSpa: null, pendingServiceRequest: null };
  }

  // Continue pending dining
  if (pendingDining) {
    const dining = await handleDiningFlow({
      message,
      langCode,
      config,
      history,
      guestProfile,
      pendingDining,
    });
    return { ...dining, pendingBooking: null, pendingSpa: null, pendingServiceRequest: null };
  }

  // Continue pending spa
  if (pendingSpa) {
    const spa = await handleSpaFlow({
      message,
      langCode,
      config,
      history,
      guestProfile,
      pendingSpa,
    });
    return { ...spa, pendingBooking: null, pendingDining: null, pendingServiceRequest: null };
  }

  // Continue pending service request
  if (pendingServiceRequest) {
    const sr = await handleServiceRequestFlow({
      message,
      langCode,
      config,
      history,
      guestProfile,
      pendingServiceRequest,
    });
    return { ...sr, pendingBooking: null, pendingDining: null, pendingSpa: null };
  }

  // Service request intent (check before booking/dining since "I need extra towels" shouldn't trigger booking)
  if (isServiceRequestIntent(message)) {
    const sr = await handleServiceRequestFlow({
      message,
      langCode,
      config,
      history,
      guestProfile,
    });
    if (sr.handled) return { ...sr, pendingBooking: null, pendingDining: null, pendingSpa: null };
  }

  // Spa intent
  if (isSpaIntent(message)) {
    const spa = await handleSpaFlow({
      message,
      langCode,
      config,
      history,
      guestProfile,
    });
    if (spa.handled) return { ...spa, pendingBooking: null, pendingDining: null, pendingServiceRequest: null };
  }

  // Dining intent
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

  // Booking intent
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
