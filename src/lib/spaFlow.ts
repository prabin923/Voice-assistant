import type { EscalationReason } from "@/lib/escalation";
import type { HotelConfig } from "@/lib/hotelConfig";
import type { ChatHistoryMessage } from "@/lib/dateParsing";
import { detectDateRange, todayIsoDate } from "@/lib/dateParsing";
import { detectReservationTime, formatReservationTime } from "@/lib/timeParsing";
import { spaReservations } from "@/lib/db";
import { extractGuestDetails, isAffirmative, isNegative } from "@/lib/bookingFlow";

export interface SpaService {
  name: string;
  durationMinutes: number;
  price: number;
  currency: string;
  description: string;
}

export type SpaSummary = {
  id: string;
  serviceName: string;
  reservationDate: string;
  reservationTime: string;
  durationMinutes: number;
  guestName: string;
  price: number;
  currency: string;
  status: string;
};

export type PendingSpa = {
  serviceName: string;
  reservationDate: string;
  reservationTime: string;
  durationMinutes: number;
  guestName: string;
  guestPhone: string;
  guestEmail?: string | null;
  specialRequests?: string | null;
  price: number;
  currency: string;
};

export type SpaFlowResult = {
  handled: boolean;
  reply?: string;
  escalate?: boolean;
  reason?: EscalationReason;
  spa?: SpaSummary;
  pendingSpa?: PendingSpa | null;
};

type GuestProfile = { id: string; name: string; phone: string | null; email: string };

const SPA_KEYWORDS = [
  "spa", "massage", "facial", "treatment", "wellness", "sauna",
  "steam room", "body scrub", "hot stone", "aromatherapy",
  "deep tissue", "swedish", "thai massage", "reflexology",
  "manicure", "pedicure", "beauty",
];

function conversationText(message: string, history: ChatHistoryMessage[]): string {
  const userHistory = history.filter((h) => h.role === "user");
  return `${userHistory.map((h) => h.content).join(" ")} ${message}`;
}

export function isSpaIntent(message: string): boolean {
  const lower = message.toLowerCase();
  return SPA_KEYWORDS.some((kw) => lower.includes(kw));
}

export function shouldRunSpaFlow(
  message: string,
  history: ChatHistoryMessage[],
  _langCode: string,
  pendingSpa?: PendingSpa | null
): boolean {
  if (pendingSpa) return true;
  return isSpaIntent(message);
}

function detectService(message: string, history: ChatHistoryMessage[], services: SpaService[]): SpaService | null {
  const source = conversationText(message, history).toLowerCase();
  for (const svc of services) {
    if (source.includes(svc.name.toLowerCase())) return svc;
  }
  // Fuzzy match on keywords
  for (const svc of services) {
    const keywords = svc.name.toLowerCase().split(/\s+/);
    if (keywords.some((kw) => kw.length > 3 && source.includes(kw))) return svc;
  }
  return null;
}

function formatServiceList(services: SpaService[]): string {
  if (!services.length) return "Our spa services are currently unavailable.";
  const list = services
    .map((s) => `${s.name} (${s.durationMinutes} min, ${s.currency} ${s.price})`)
    .join("; ");
  return `We offer: ${list}. Which treatment would you like?`;
}

export async function handleSpaFlow(params: {
  message: string;
  langCode: string;
  config: HotelConfig;
  history: ChatHistoryMessage[];
  guestProfile?: GuestProfile;
  pendingSpa?: PendingSpa | null;
}): Promise<SpaFlowResult> {
  const { message, config, history, guestProfile, pendingSpa } = params;
  const services: SpaService[] = (config as HotelConfig & { spa?: SpaService[] }).spa ?? [];

  // Pending confirmation
  if (pendingSpa) {
    if (isNegative(message)) {
      return { handled: true, reply: "No problem — what would you like to change?", pendingSpa: null };
    }

    if (isAffirmative(message)) {
      const res = await spaReservations.create({
        serviceName: pendingSpa.serviceName,
        reservationDate: pendingSpa.reservationDate,
        reservationTime: pendingSpa.reservationTime,
        durationMinutes: pendingSpa.durationMinutes,
        guestName: pendingSpa.guestName,
        guestPhone: pendingSpa.guestPhone,
        guestEmail: pendingSpa.guestEmail ?? undefined,
        guestId: guestProfile?.id,
        specialRequests: pendingSpa.specialRequests ?? undefined,
        price: pendingSpa.price,
        currency: pendingSpa.currency,
      });

      return {
        handled: true,
        reply: `Your ${pendingSpa.serviceName} is booked for ${pendingSpa.reservationDate} at ${formatReservationTime(pendingSpa.reservationTime)}! Duration: ${pendingSpa.durationMinutes} min. Total: ${pendingSpa.currency} ${pendingSpa.price}. Reservation #${res.id.slice(0, 8).toUpperCase()}.`,
        spa: {
          id: res.id,
          serviceName: res.service_name,
          reservationDate: res.reservation_date,
          reservationTime: res.reservation_time,
          durationMinutes: res.duration_minutes,
          guestName: res.guest_name,
          price: res.price,
          currency: res.currency,
          status: res.status,
        },
        pendingSpa: null,
      };
    }

    // Modifications to pending
    return { handled: true, reply: "Would you like to confirm your spa reservation? Reply yes to book, or tell me what to change.", pendingSpa };
  }

  // No services configured
  if (!services.length) {
    return {
      handled: true,
      reply: "Our spa and wellness center offers a range of treatments. Please contact the front desk for availability and booking.",
    };
  }

  // Detect which service
  const service = detectService(message, history, services);
  if (!service) {
    return { handled: true, reply: formatServiceList(services) };
  }

  // Detect date
  const dateRange = detectDateRange(message, history);
  const date = dateRange.checkIn || todayIsoDate();

  // Detect time
  const time = detectReservationTime(message, history) || "10:00";

  // Detect guest details
  const details = extractGuestDetails(message, history);
  const guestName = details.guestName || guestProfile?.name;
  const guestPhone = details.guestPhone || guestProfile?.phone || undefined;

  if (!guestName || !guestPhone) {
    return {
      handled: true,
      reply: `Great choice — the ${service.name} is ${service.currency} ${service.price} for ${service.durationMinutes} minutes. I just need your name and phone to complete the booking.`,
      pendingSpa: {
        serviceName: service.name,
        reservationDate: date,
        reservationTime: time,
        durationMinutes: service.durationMinutes,
        guestName: guestName || "",
        guestPhone: guestPhone || "",
        price: service.price,
        currency: service.currency,
      },
    };
  }

  // Build confirmation
  const pending: PendingSpa = {
    serviceName: service.name,
    reservationDate: date,
    reservationTime: time,
    durationMinutes: service.durationMinutes,
    guestName,
    guestPhone,
    guestEmail: details.guestEmail || guestProfile?.email,
    price: service.price,
    currency: service.currency,
  };

  return {
    handled: true,
    reply: `Just to confirm: ${service.name} on ${date} at ${formatReservationTime(time)}, ${service.durationMinutes} min, for ${guestName}. Total: ${service.currency} ${service.price}. Reply yes to book.`,
    pendingSpa: pending,
  };
}
