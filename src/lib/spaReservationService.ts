import { spaReservations, type SpaReservation } from "@/lib/db";
import { getHotelConfig } from "@/lib/hotelConfig";
import { sendStaffSpaReservationEmail } from "@/lib/email";

export type CreateSpaInput = {
  serviceName: string;
  reservationDate: string;
  reservationTime: string;
  durationMinutes?: number;
  guestName: string;
  guestPhone: string;
  guestEmail?: string | null;
  guestId?: string | null;
  therapistPreference?: string | null;
  specialRequests?: string | null;
  price?: number;
  currency?: string;
};

export type SpaReservationSummary = {
  id: string;
  serviceName: string;
  reservationDate: string;
  reservationTime: string;
  durationMinutes: number;
  guestName: string;
  guestPhone: string;
  guestEmail?: string | null;
  price: number;
  currency: string;
  status: string;
  specialRequests?: string | null;
};

export function toSpaSummary(row: SpaReservation): SpaReservationSummary {
  return {
    id: row.id,
    serviceName: row.service_name,
    reservationDate: row.reservation_date,
    reservationTime: row.reservation_time,
    durationMinutes: row.duration_minutes,
    guestName: row.guest_name,
    guestPhone: row.guest_phone,
    guestEmail: row.guest_email,
    price: row.price,
    currency: row.currency,
    status: row.status,
    specialRequests: row.special_requests,
  };
}

export async function createSpaReservationSafe(input: CreateSpaInput): Promise<
  | { ok: true; reservation: SpaReservation }
  | { ok: false; error: string; status: number }
> {
  const serviceName = input.serviceName.trim();
  const guestName = input.guestName.trim();
  const guestPhone = input.guestPhone.trim();

  if (!serviceName || !input.reservationDate || !input.reservationTime) {
    return { ok: false, error: "Service, date, and time are required.", status: 400 };
  }
  if (!guestName || guestPhone.length < 8) {
    return { ok: false, error: "Guest name and phone are required.", status: 400 };
  }

  try {
    const reservation = await spaReservations.create({
      serviceName,
      reservationDate: input.reservationDate,
      reservationTime: input.reservationTime,
      durationMinutes: input.durationMinutes,
      guestName,
      guestPhone,
      guestEmail: input.guestEmail?.trim() || undefined,
      guestId: input.guestId ?? undefined,
      therapistPreference: input.therapistPreference?.trim() || undefined,
      specialRequests: input.specialRequests?.trim() || undefined,
      price: input.price,
      currency: input.currency,
    });

    notifySpaReservationComplete(reservation);
    return { ok: true, reservation };
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "P2021" || code === "42P01") {
      return {
        ok: false,
        error: "Spa reservations are not enabled yet. Please run database migrations.",
        status: 503,
      };
    }
    return { ok: false, error: "Could not save the spa reservation.", status: 500 };
  }
}

export function notifySpaReservationComplete(reservation: SpaReservation): void {
  const config = getHotelConfig();
  console.log(
    `[SPA] Reservation #${reservation.id.slice(0, 8)} — ${reservation.service_name} ${reservation.reservation_date} ${reservation.reservation_time} for ${reservation.guest_name}`
  );
  void sendStaffSpaReservationEmail({
    staffEmail: config.contact.email,
    hotelName: config.branding.hotelName,
    reservation: toSpaSummary(reservation),
  }).catch((err) => console.error("[EMAIL] Spa reservation FYI failed:", err));
}
