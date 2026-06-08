import type { Booking } from "@/lib/db";
import { getHotelConfig } from "@/lib/hotelConfig";
import { sendBookingConfirmationEmail, bookingRowToEmailPayload } from "@/lib/email";
import { notifyStaffBookingComplete } from "@/lib/staffNotifications";
import { sendBookingSms } from "@/lib/sms";

/** Notify guest (email + SMS) and staff after a booking event. */
export function notifyBookingComplete(
  booking: Booking,
  action: "confirmed" | "modified" | "cancelled",
  guestMessage?: string
): void {
  const config = getHotelConfig();

  if (action === "confirmed" || action === "modified") {
    if (booking.guest_email) {
      void sendBookingConfirmationEmail({
        toEmail: booking.guest_email,
        hotelName: config.branding.hotelName,
        booking: bookingRowToEmailPayload(booking),
      }).catch((err) => console.error("[EMAIL] Booking confirmation failed:", err));
    }
    if (booking.guest_phone) {
      void sendBookingSms({
        toPhone: booking.guest_phone,
        hotelName: config.branding.hotelName,
        bookingId: booking.id,
        roomType: booking.room_type,
        checkIn: booking.check_in,
        checkOut: booking.check_out,
      });
    }
  }

  void notifyStaffBookingComplete({
    hotelName: config.branding.hotelName,
    action,
    booking,
    guestMessage,
  });
}
