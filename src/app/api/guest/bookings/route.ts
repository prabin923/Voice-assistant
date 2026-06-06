import { NextResponse } from "next/server";
import { requireGuestAuth } from "@/lib/guestAuth";
import { bookings, ensureDbReady } from "@/lib/db";
import { publicBookingRow } from "@/lib/bookingService";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireGuestAuth();
  if (auth.error) return auth.error;

  await ensureDbReady();

  const list = await bookings.listByGuestId(auth.session.guestId, 50);
  return NextResponse.json({
    bookings: list.map(publicBookingRow),
  });
}
