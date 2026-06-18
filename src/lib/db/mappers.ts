import type {
  AuthAuditLog,
  Booking,
  DiningReservation,
  Guest,
  Hotel,
  Interaction,
  SupportTicket,
} from "@/lib/db/types";
import type {
  AuthAuditLog as PrismaAuthAuditLog,
  Booking as PrismaBooking,
  DiningReservation as PrismaDiningReservation,
  Feedback as PrismaFeedback,
  Guest as PrismaGuest,
  Hotel as PrismaHotel,
  Interaction as PrismaInteraction,
  SupportTicket as PrismaSupportTicket,
} from "../../../generated/prisma/client";

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

export function mapHotel(row: PrismaHotel): Hotel {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    slug: row.slug,
    password: row.password,
    session_version: row.sessionVersion,
    config: row.config,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export function mapInteraction(row: PrismaInteraction): Interaction {
  return {
    id: row.id,
    guest_message: row.guestMessage,
    ai_response: row.aiResponse,
    language: row.language,
    guest_id: row.guestId,
    created_at: row.createdAt.toISOString(),
  };
}

export function mapSupportTicket(row: PrismaSupportTicket): SupportTicket {
  return {
    id: row.id,
    guest_message: row.guestMessage,
    ai_response: row.aiResponse,
    language: row.language,
    status: row.status,
    staff_reply: row.staffReply,
    escalation_reason: row.escalationReason,
    created_at: row.createdAt.toISOString(),
    resolved_at: toIso(row.resolvedAt),
  };
}

export function mapBooking(row: PrismaBooking): Booking {
  return {
    id: row.id,
    room_type: row.roomType,
    check_in: row.checkIn,
    check_out: row.checkOut,
    rooms: row.rooms,
    guest_name: row.guestName,
    guest_phone: row.guestPhone,
    guest_email: row.guestEmail,
    guest_id: row.guestId,
    status: row.status,
    special_requests: row.specialRequests ?? null,
    created_at: row.createdAt.toISOString(),
  };
}

export function mapDiningReservation(row: PrismaDiningReservation): DiningReservation {
  return {
    id: row.id,
    venue_name: row.venueName,
    reservation_date: row.reservationDate,
    reservation_time: row.reservationTime,
    party_size: row.partySize,
    guest_name: row.guestName,
    guest_phone: row.guestPhone,
    guest_email: row.guestEmail,
    guest_id: row.guestId,
    status: row.status,
    special_requests: row.specialRequests ?? null,
    created_at: row.createdAt.toISOString(),
  };
}

export function mapGuest(row: PrismaGuest): Guest {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password,
    phone: row.phone,
    preferred_language: row.preferredLanguage,
    session_version: row.sessionVersion,
    visit_count: row.visitCount,
    message_count: row.messageCount,
    booking_count: row.bookingCount,
    last_visit_at: toIso(row.lastVisitAt),
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export function mapAuthAuditLog(row: PrismaAuthAuditLog): AuthAuditLog {
  return {
    id: row.id,
    hotel_id: row.hotelId,
    email: row.email,
    event: row.event,
    ip: row.ip,
    user_agent: row.userAgent,
    metadata: row.metadata,
    created_at: row.createdAt.toISOString(),
  };
}

export function mapFeedback(row: PrismaFeedback) {
  return {
    id: row.id,
    message_content: row.messageContent,
    rating: row.rating,
    comment: row.comment,
    guest_id: row.guestId,
    created_at: row.createdAt.toISOString(),
  };
}
