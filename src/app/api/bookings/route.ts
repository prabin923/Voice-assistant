import { NextResponse } from "next/server";
import { bookings, ensureDbReady } from "@/lib/db";
import { requireAuth, getSession } from "@/lib/auth";
import { validateCsrf } from "@/lib/csrf";
import { getClientIP } from "@/lib/rateLimit";
import { checkRateLimitAsync } from "@/lib/rateLimitDistributed";
import { getGuestSession } from "@/lib/guestAuth";
import { createBookingSafe, publicBookingRow } from "@/lib/bookingService";
import { notifyBookingComplete } from "@/lib/bookingNotify";

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
  // Hotel owner / staff manual booking: CSRF-protected, no IP rate limit.
  // Anonymous/guest booking: keep the IP rate limit. Both paths flow through
  // createBookingSafe -> the same transactional availability check, so a manual
  // booking can never conflict with (double-book against) an AI booking.
  const adminSession = await getSession();
  if (adminSession) {
    const csrfError = await validateCsrf(req);
    if (csrfError) return csrfError;
  } else {
    const ip = getClientIP(req);
    const limit = await checkRateLimitAsync(`bookings:${ip}`, { maxRequests: 12, windowMs: 60000 });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many booking attempts. Please wait a moment." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } }
      );
    }
  }

  try {
    await ensureDbReady();

    const body = await req.json();
    // Manual owner bookings are for walk-in/phone guests (no registered account).
    const guestSession = adminSession ? null : await getGuestSession();

    const result = await createBookingSafe({
      roomType: String(body.roomType || ""),
      checkIn: String(body.checkIn || ""),
      checkOut: String(body.checkOut || ""),
      guestName: String(body.guestName || ""),
      guestPhone: String(body.guestPhone || ""),
      guestEmail: String(body.guestEmail || "").trim() || null,
      rooms: Number(body.rooms || 1),
      guestId: guestSession?.guestId ?? null,
      specialRequests: String(body.specialRequests || "").trim() || null,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, ...(result.available !== undefined ? { available: result.available } : {}) },
        { status: result.status }
      );
    }

    notifyBookingComplete(result.booking, "confirmed");

    return NextResponse.json({ success: true, booking: publicBookingRow(result.booking) });
  } catch {
    return NextResponse.json({ error: "Failed to create booking." }, { status: 500 });
  }
}
