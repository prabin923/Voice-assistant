import { availability, bookings, type Booking } from "@/lib/db";
import { getHotelConfig, type HotelConfig } from "@/lib/hotelConfig";
import { sendBookingConfirmationEmail, bookingRowToEmailPayload } from "@/lib/email";

export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function validateRoomType(roomType: string, config?: HotelConfig): boolean {
  const cfg = config ?? getHotelConfig();
  return cfg.rooms.some((room) => room.name === roomType);
}

export type CreateBookingInput = {
  roomType: string;
  checkIn: string;
  checkOut: string;
  rooms?: number;
  guestName: string;
  guestPhone: string;
  guestEmail?: string | null;
  guestId?: string | null;
};

export type CreateBookingResult =
  | { ok: true; booking: Booking }
  | { ok: false; error: string; status: number; available?: number };

export async function createBookingSafe(input: CreateBookingInput): Promise<CreateBookingResult> {
  const config = getHotelConfig();
  const roomType = input.roomType.trim();
  const checkIn = input.checkIn.trim();
  const checkOut = input.checkOut.trim();
  const guestName = input.guestName.trim();
  const guestPhone = input.guestPhone.trim();

  if (!roomType || !guestName || !guestPhone) {
    return {
      ok: false,
      error: "roomType, guestName, and guestPhone are required.",
      status: 400,
    };
  }

  if (!validateRoomType(roomType, config)) {
    return { ok: false, error: "Invalid room type.", status: 400 };
  }

  if (!isIsoDate(checkIn) || !isIsoDate(checkOut)) {
    return { ok: false, error: "Dates must be YYYY-MM-DD.", status: 400 };
  }

  if (checkIn >= checkOut) {
    return { ok: false, error: "checkOut must be after checkIn.", status: 400 };
  }

  const requestedRooms = Math.max(1, Math.floor(input.rooms ?? 1));

  try {
    const booking = await bookings.createTransactional({
      roomType,
      checkIn,
      checkOut,
      rooms: requestedRooms,
      guestName,
      guestPhone,
      guestEmail: input.guestEmail?.trim() || null,
      guestId: input.guestId ?? null,
      status: "confirmed",
    });
    return { ok: true, booking };
  } catch (err) {
    if (err instanceof Error && err.message === "UNAVAILABLE") {
      const roomAvailability = await availability.get(roomType, checkIn, checkOut);
      return {
        ok: false,
        error: "Requested room is not available for those dates.",
        status: 409,
        available: roomAvailability.available,
      };
    }
    throw err;
  }
}

export async function cancelBookingSafe(
  bookingId: string,
  opts: { guestId?: string } = {}
): Promise<{ ok: true; booking: Booking } | { ok: false; error: string; status: number }> {
  const existing = await bookings.getById(bookingId);
  if (!existing) {
    return { ok: false, error: "Booking not found.", status: 404 };
  }

  if (opts.guestId && existing.guest_id !== opts.guestId) {
    return { ok: false, error: "Booking not found.", status: 404 };
  }

  if (existing.status === "cancelled") {
    return { ok: false, error: "Booking is already cancelled.", status: 400 };
  }

  const cancelled = await bookings.cancel(bookingId);
  if (!cancelled) {
    return { ok: false, error: "Failed to cancel booking.", status: 500 };
  }

  return { ok: true, booking: cancelled };
}

export async function modifyBookingSafe(
  bookingId: string,
  updates: { roomType?: string; checkIn?: string; checkOut?: string; rooms?: number },
  opts: { guestId?: string } = {}
): Promise<{ ok: true; booking: Booking } | { ok: false; error: string; status: number; available?: number }> {
  const existing = await bookings.getById(bookingId);
  if (!existing) {
    return { ok: false, error: "Booking not found.", status: 404 };
  }

  if (opts.guestId && existing.guest_id !== opts.guestId) {
    return { ok: false, error: "Booking not found.", status: 404 };
  }

  if (existing.status !== "confirmed") {
    return { ok: false, error: "Only confirmed bookings can be modified.", status: 400 };
  }

  const config = getHotelConfig();
  const roomType = (updates.roomType ?? existing.room_type).trim();
  const checkIn = (updates.checkIn ?? existing.check_in).trim();
  const checkOut = (updates.checkOut ?? existing.check_out).trim();
  const rooms = Math.max(1, Math.floor(updates.rooms ?? existing.rooms));

  if (!validateRoomType(roomType, config)) {
    return { ok: false, error: "Invalid room type.", status: 400 };
  }

  if (!isIsoDate(checkIn) || !isIsoDate(checkOut)) {
    return { ok: false, error: "Dates must be YYYY-MM-DD.", status: 400 };
  }

  if (checkIn >= checkOut) {
    return { ok: false, error: "checkOut must be after checkIn.", status: 400 };
  }

  try {
    const booking = await bookings.modify(bookingId, { roomType, checkIn, checkOut, rooms });
    return { ok: true, booking };
  } catch (err) {
    if (err instanceof Error && err.message === "UNAVAILABLE") {
      const roomAvailability = await availability.get(roomType, checkIn, checkOut);
      return {
        ok: false,
        error: "Requested room is not available for those dates.",
        status: 409,
        available: roomAvailability.available,
      };
    }
    if (err instanceof Error && err.message === "NOT_MODIFIABLE") {
      return { ok: false, error: "Booking cannot be modified.", status: 400 };
    }
    throw err;
  }
}

export function sendBookingEmailIfNeeded(booking: Booking) {
  if (!booking.guest_email) return;
  const config = getHotelConfig();
  void sendBookingConfirmationEmail({
    toEmail: booking.guest_email,
    hotelName: config.branding.hotelName,
    booking: bookingRowToEmailPayload(booking),
  }).catch((err) => console.error("[EMAIL] Booking confirmation failed:", err));
}

export function publicBookingRow(booking: Booking) {
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
    createdAt: booking.created_at,
  };
}
