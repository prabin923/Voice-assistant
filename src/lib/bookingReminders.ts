import { getHotelConfig } from "@/lib/hotelConfig";
import prisma from "@/lib/prisma";
import { mapBooking } from "@/lib/db/mappers";
import type { Booking } from "@/lib/db/types";

export function generateIcsFile(booking: Booking): string {
  const config = getHotelConfig();
  const formatIcsDate = (isoDateStr: string) => {
    // Convert YYYY-MM-DD to YYYYMMDD
    return isoDateStr.replace(/-/g, "");
  };

  const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const start = formatIcsDate(booking.check_in);
  // Add 1 day to check_out for standard all-day event calendar compatibility if needed,
  // or just use check_out. In ICS format, DTSTART/DTEND with VALUE=DATE is non-inclusive for end date.
  const end = formatIcsDate(booking.check_out);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//StayNep//Hotel Voice Assistant//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:booking-${booking.id}@staynep.com`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:Stay at ${config.branding.hotelName} (${booking.room_type})`,
    `DESCRIPTION:Confirmation Code: ${booking.id.slice(0, 8).toUpperCase()}\\nRoom Type: ${booking.room_type}\\nRooms: ${booking.rooms}\\nGuest: ${booking.guest_name}\\nPhone: ${booking.guest_phone}\\nSpecial Requests: ${booking.special_requests || "None"}\\n\\nThank you for choosing ${config.branding.hotelName}!`,
    `LOCATION:${config.branding.hotelName} - ${config.contact.email}`,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "TRANSP:TRANSPARENT",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.join("\r\n");
}

export async function getUpcomingBookingsForReminder(): Promise<Booking[]> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const rows = await prisma.booking.findMany({
    where: {
      status: "confirmed",
      checkIn: tomorrowStr,
    },
  });

  return rows.map(mapBooking);
}
