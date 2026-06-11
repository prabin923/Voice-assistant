import { randomUUID } from "crypto";
import { diningReservations, type DiningReservation } from "@/lib/db";
import { getHotelConfig } from "@/lib/hotelConfig";
import { sendStaffDiningReservationEmail } from "@/lib/email";

export type CreateDiningInput = {
  venueName: string;
  reservationDate: string;
  reservationTime: string;
  partySize: number;
  guestName: string;
  guestPhone: string;
  guestEmail?: string | null;
  guestId?: string | null;
  specialRequests?: string | null;
};

export type DiningReservationSummary = {
  id: string;
  venueName: string;
  reservationDate: string;
  reservationTime: string;
  partySize: number;
  guestName: string;
  guestPhone: string;
  guestEmail?: string | null;
  status: string;
  specialRequests?: string | null;
};

export function toDiningSummary(row: DiningReservation): DiningReservationSummary {
  return {
    id: row.id,
    venueName: row.venue_name,
    reservationDate: row.reservation_date,
    reservationTime: row.reservation_time,
    partySize: row.party_size,
    guestName: row.guest_name,
    guestPhone: row.guest_phone,
    guestEmail: row.guest_email,
    status: row.status,
    specialRequests: row.special_requests,
  };
}

export async function createDiningReservationSafe(input: CreateDiningInput): Promise<
  | { ok: true; reservation: DiningReservation }
  | { ok: false; error: string; status: number }
> {
  const venueName = input.venueName.trim();
  const guestName = input.guestName.trim();
  const guestPhone = input.guestPhone.trim();

  if (!venueName || !input.reservationDate || !input.reservationTime) {
    return { ok: false, error: "Venue, date, and time are required.", status: 400 };
  }
  if (!guestName || guestPhone.length < 8) {
    return { ok: false, error: "Guest name and phone are required.", status: 400 };
  }

  const config = getHotelConfig();
  const venue = config.dining.find((v) => v.name.toLowerCase() === venueName.toLowerCase());
  if (!venue) {
    return { ok: false, error: `We don't have a dining venue called "${venueName}".`, status: 400 };
  }

  const partySize = Math.max(1, Math.min(20, Math.floor(input.partySize)));

  try {
    const reservation = await diningReservations.create({
      id: randomUUID(),
      venueName: venue.name,
      reservationDate: input.reservationDate,
      reservationTime: input.reservationTime,
      partySize,
      guestName,
      guestPhone,
      guestEmail: input.guestEmail?.trim() || null,
      guestId: input.guestId ?? null,
      specialRequests: input.specialRequests?.trim() || null,
    });

    notifyDiningReservationComplete(reservation);
    return { ok: true, reservation };
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "P2021" || code === "42P01") {
      return {
        ok: false,
        error: "Dining reservations are not enabled yet. Please run database migrations.",
        status: 503,
      };
    }
    return { ok: false, error: "Could not save the dining reservation.", status: 500 };
  }
}

export function notifyDiningReservationComplete(reservation: DiningReservation): void {
  const config = getHotelConfig();
  console.log(
    `[DINING] Reservation #${reservation.id.slice(0, 8)} — ${reservation.venue_name} ${reservation.reservation_date} ${reservation.reservation_time} for ${reservation.guest_name}`
  );
  void sendStaffDiningReservationEmail({
    staffEmail: config.contact.email,
    hotelName: config.branding.hotelName,
    reservation: toDiningSummary(reservation),
  }).catch((err) => console.error("[EMAIL] Dining reservation FYI failed:", err));
}
