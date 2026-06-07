import { getHotelConfig } from "@/lib/hotelConfig";
import type { Booking } from "@/lib/db";
import { sendStaffBookingCompleteEmail } from "@/lib/email";

export type StaffBookingAction = "confirmed" | "modified" | "cancelled";

export interface StaffBookingNotificationInput {
  hotelName: string;
  action: StaffBookingAction;
  booking: Booking;
  guestMessage?: string;
}

/** Informational staff notice — not an escalation ticket. */
export async function notifyStaffBookingComplete(input: StaffBookingNotificationInput): Promise<void> {
  const config = getHotelConfig();
  const staffEmail = config.contact.email;
  if (!staffEmail) return;

  const actionLabel =
    input.action === "confirmed"
      ? "New booking confirmed"
      : input.action === "modified"
        ? "Booking updated"
        : "Booking cancelled";

  console.log(
    `[BOOKING FYI] ${actionLabel} #${input.booking.id.slice(0, 8)} — ${input.booking.guest_name} (${input.booking.room_type})`
  );

  await sendStaffBookingCompleteEmail({
    staffEmail,
    hotelName: input.hotelName,
    action: input.action,
    booking: {
      id: input.booking.id,
      roomType: input.booking.room_type,
      checkIn: input.booking.check_in,
      checkOut: input.booking.check_out,
      rooms: input.booking.rooms,
      guestName: input.booking.guest_name,
      guestPhone: input.booking.guest_phone,
      guestEmail: input.booking.guest_email,
      status: input.booking.status,
    },
    guestMessage: input.guestMessage,
  }).catch((err) => console.error("[EMAIL] Staff booking FYI failed:", err));
}
