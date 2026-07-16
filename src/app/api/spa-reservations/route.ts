import { NextResponse } from "next/server";
import { spaReservations } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { createSpaReservationSafe } from "@/lib/spaReservationService";
import { getGuestSession } from "@/lib/guestAuth";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const list = await spaReservations.listRecent(100);
  return NextResponse.json({ reservations: list });
}

export async function POST(req: Request) {
  // Can be guest authenticated or public/admin
  const guestSession = await getGuestSession();
  let guestRecord = null;
  if (guestSession) {
    const { guests: guestsRepo } = await import("@/lib/db");
    guestRecord = await guestsRepo.findById(guestSession.guestId);
  }

  const body = await req.json() as {
    serviceName: string;
    reservationDate: string;
    reservationTime: string;
    durationMinutes?: number;
    guestName: string;
    guestPhone: string;
    guestEmail?: string;
    therapistPreference?: string;
    specialRequests?: string;
    price?: number;
    currency?: string;
  };

  const result = await createSpaReservationSafe({
    serviceName: body.serviceName,
    reservationDate: body.reservationDate,
    reservationTime: body.reservationTime,
    durationMinutes: body.durationMinutes,
    guestName: body.guestName || guestRecord?.name || "",
    guestPhone: body.guestPhone || guestRecord?.phone || "",
    guestEmail: body.guestEmail || guestRecord?.email || undefined,
    guestId: guestSession?.guestId,
    therapistPreference: body.therapistPreference,
    specialRequests: body.specialRequests,
    price: body.price,
    currency: body.currency,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ reservation: result.reservation }, { status: 201 });
}

export async function PATCH(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const body = await req.json() as { id: string; action: "cancel" };
  if (!body.id || body.action !== "cancel") {
    return NextResponse.json({ error: "Missing id or invalid action" }, { status: 400 });
  }
  const cancelled = await spaReservations.cancel(body.id);
  if (!cancelled) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ reservation: cancelled });
}
