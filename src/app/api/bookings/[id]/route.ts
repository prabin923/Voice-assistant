import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { validateCsrf } from "@/lib/csrf";
import { bookings, ensureDbReady } from "@/lib/db";
import { cancelBookingSafe, modifyBookingSafe, publicBookingRow } from "@/lib/bookingService";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, context: RouteContext) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const csrfError = await validateCsrf(req);
  if (csrfError) return csrfError;

  await ensureDbReady();

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const action = typeof body?.action === "string" ? body.action : "";

  if (action === "cancel") {
    const result = await cancelBookingSafe(id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true, booking: publicBookingRow(result.booking) });
  }

  if (action === "modify") {
    const updates: { roomType?: string; checkIn?: string; checkOut?: string; rooms?: number } = {};
    if (body.roomType != null) updates.roomType = String(body.roomType);
    if (body.checkIn != null) updates.checkIn = String(body.checkIn);
    if (body.checkOut != null) updates.checkOut = String(body.checkOut);
    if (body.rooms != null) updates.rooms = Number(body.rooms);

    const result = await modifyBookingSafe(id, updates);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, ...(result.available !== undefined ? { available: result.available } : {}) },
        { status: result.status }
      );
    }
    return NextResponse.json({ success: true, booking: publicBookingRow(result.booking) });
  }

  return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
}

export async function GET(_req: Request, context: RouteContext) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  await ensureDbReady();

  const { id } = await context.params;
  const booking = await bookings.getById(id);
  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  return NextResponse.json({ booking: publicBookingRow(booking) });
}
