import { NextResponse } from "next/server";
import { bookings, ensureDbReady } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getClientIP } from "@/lib/rateLimit";
import { checkRateLimitAsync } from "@/lib/rateLimitDistributed";
import { getGuestSession } from "@/lib/guestAuth";
import {
  createBookingSafe,
  sendBookingEmailIfNeeded,
  publicBookingRow,
} from "@/lib/bookingService";
import { ensureHotelConfigLoaded } from "@/lib/hotelConfig";
import { notifyStaffBookingComplete } from "@/lib/staffNotifications";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  await ensureDbReady();

  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") || 100);
  const mode = searchParams.get("mode");
  const list =
    mode === "upcoming"
      ? await bookings.upcoming(Math.max(1, Math.min(300, Math.floor(limit))))
      : await bookings.list(Math.max(1, Math.min(300, Math.floor(limit))));
  return NextResponse.json({ bookings: list });
}

export async function POST(req: Request) {
  const ip = getClientIP(req);
  const limit = await checkRateLimitAsync(`bookings:${ip}`, { maxRequests: 12, windowMs: 60000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many booking attempts. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } }
    );
  }

  try {
    await ensureDbReady();

    const body = await req.json();
    const guestSession = await getGuestSession();

    const result = await createBookingSafe({
      roomType: String(body.roomType || ""),
      checkIn: String(body.checkIn || ""),
      checkOut: String(body.checkOut || ""),
      guestName: String(body.guestName || ""),
      guestPhone: String(body.guestPhone || ""),
      guestEmail: String(body.guestEmail || "").trim() || null,
      rooms: Number(body.rooms || 1),
      guestId: guestSession?.guestId ?? null,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, ...(result.available !== undefined ? { available: result.available } : {}) },
        { status: result.status }
      );
    }

    sendBookingEmailIfNeeded(result.booking);
    const config = await ensureHotelConfigLoaded();
    void notifyStaffBookingComplete({
      hotelName: config.branding.hotelName,
      action: "confirmed",
      booking: result.booking,
    });

    return NextResponse.json({ success: true, booking: publicBookingRow(result.booking) });
  } catch {
    return NextResponse.json({ error: "Failed to create booking." }, { status: 500 });
  }
}
