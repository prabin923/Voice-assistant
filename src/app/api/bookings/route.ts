import { NextResponse } from "next/server";
import { availability, bookings } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { checkRateLimit, getClientIP } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function GET(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") || 100);
  const mode = searchParams.get("mode");
  const list =
    mode === "upcoming"
      ? bookings.upcoming(Math.max(1, Math.min(300, Math.floor(limit))))
      : bookings.list(Math.max(1, Math.min(300, Math.floor(limit))));
  return NextResponse.json({ bookings: list });
}

export async function POST(req: Request) {
  const ip = getClientIP(req);
  const limit = checkRateLimit(`bookings:${ip}`, { maxRequests: 12, windowMs: 60000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many booking attempts. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } }
    );
  }

  try {
    const body = await req.json();
    const roomType = String(body.roomType || "").trim();
    const checkIn = String(body.checkIn || "").trim();
    const checkOut = String(body.checkOut || "").trim();
    const guestName = String(body.guestName || "").trim();
    const guestPhone = String(body.guestPhone || "").trim();
    const guestEmail = String(body.guestEmail || "").trim();
    const rooms = Number(body.rooms || 1);

    if (!roomType || !guestName || !guestPhone || !isIsoDate(checkIn) || !isIsoDate(checkOut)) {
      return NextResponse.json(
        {
          error:
            "roomType, checkIn, checkOut, guestName, and guestPhone are required (dates must be YYYY-MM-DD).",
        },
        { status: 400 }
      );
    }
    if (checkIn >= checkOut) {
      return NextResponse.json({ error: "checkOut must be after checkIn." }, { status: 400 });
    }

    const requestedRooms = Math.max(1, Math.floor(rooms));
    const roomAvailability = availability.get(roomType, checkIn, checkOut);
    if (roomAvailability.available < requestedRooms) {
      return NextResponse.json(
        {
          error: "Requested room is not available for those dates.",
          available: roomAvailability.available,
        },
        { status: 409 }
      );
    }

    const booking = bookings.create({
      roomType,
      checkIn,
      checkOut,
      rooms: requestedRooms,
      guestName,
      guestPhone,
      guestEmail: guestEmail || null,
      status: "confirmed",
    });

    return NextResponse.json({ success: true, booking });
  } catch {
    return NextResponse.json({ error: "Failed to create booking." }, { status: 500 });
  }
}
