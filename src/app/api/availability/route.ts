import { NextResponse } from "next/server";
import { availability } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { validateCsrf } from "@/lib/csrf";
import { getHotelConfig } from "@/lib/hotelConfig";

export const dynamic = "force-dynamic";

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function addDays(date: string, days: number): string {
  const base = new Date(`${date}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const checkIn = searchParams.get("checkIn")?.trim() || "";
  const checkOut = searchParams.get("checkOut")?.trim() || "";
  const groupBy = searchParams.get("groupBy")?.trim();

  if (!isIsoDate(checkIn) || !isIsoDate(checkOut)) {
    return NextResponse.json(
      { error: "checkIn and checkOut are required in YYYY-MM-DD format." },
      { status: 400 }
    );
  }

  if (checkIn >= checkOut) {
    return NextResponse.json(
      { error: "checkOut must be after checkIn." },
      { status: 400 }
    );
  }

  const config = getHotelConfig();
  const byRoom = config.rooms.map((room) => {
    const summary = availability.get(room.name, checkIn, checkOut);
    const payload: Record<string, unknown> = {
      maxOccupancy: room.maxOccupancy,
      pricePerNight: room.pricePerNight,
      currency: room.currency,
      ...summary,
    };

    if (groupBy === "day") {
      const byDate: Record<string, number> = {};
      const bookedByDate: Record<string, number> = {};
      for (let cursor = checkIn; cursor < checkOut; cursor = addDays(cursor, 1)) {
        const nightly = availability.getNight(room.name, cursor);
        byDate[cursor] = nightly.free;
        bookedByDate[cursor] = nightly.booked;
      }
      payload.byDate = byDate;
      payload.bookedByDate = bookedByDate;
    }

    return payload;
  });

  return NextResponse.json({
    checkIn,
    checkOut,
    byRoom,
  });
}

// Staff-only endpoint for inventory calendar updates in Settings.
export async function PUT(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const csrfError = await validateCsrf(req);
  if (csrfError) return csrfError;

  try {
    const body = await req.json();
    const roomType = String(body.roomType || "").trim();
    const date = String(body.date || "").trim();
    const count = Number(body.count);
    const defaultCount = body.defaultCount == null ? null : Number(body.defaultCount);
    const clearOverride = Boolean(body.clearOverride);

    if (!roomType) {
      return NextResponse.json({ error: "roomType is required." }, { status: 400 });
    }

    if (defaultCount != null) {
      if (!Number.isFinite(defaultCount) || defaultCount < 0) {
        return NextResponse.json({ error: "defaultCount must be >= 0." }, { status: 400 });
      }
      availability.setDefault(roomType, Math.floor(defaultCount));
    }

    if (date) {
      if (!isIsoDate(date)) {
        return NextResponse.json({ error: "date must be YYYY-MM-DD." }, { status: 400 });
      }
      if (clearOverride) {
        availability.clearOverride(roomType, date);
      } else {
        if (!Number.isFinite(count) || count < 0) {
          return NextResponse.json({ error: "count must be >= 0." }, { status: 400 });
        }
        availability.setOverride(roomType, date, Math.floor(count));
      }
    }

    if (defaultCount == null && !date) {
      return NextResponse.json(
        { error: "Provide either defaultCount or (date + count)." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to update availability." },
      { status: 500 }
    );
  }
}
