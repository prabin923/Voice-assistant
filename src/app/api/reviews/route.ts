import { NextResponse } from "next/server";
import { reviews } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getGuestSession } from "@/lib/guestAuth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const hotelId = url.searchParams.get("hotelId");
  const onlyApproved = url.searchParams.get("status") !== "all";

  if (onlyApproved) {
    const list = await reviews.listApproved(hotelId ?? undefined);
    const stats = await reviews.stats(hotelId ?? undefined);
    return NextResponse.json({ reviews: list, stats });
  }

  // Admin view — all reviews
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const list = await reviews.listAll();
  const stats = await reviews.stats();
  return NextResponse.json({ reviews: list, stats });
}

export async function POST(req: Request) {
  const guestSession = await getGuestSession();
  let guestRecord = null;
  if (guestSession) {
    const { guests: guestsRepo } = await import("@/lib/db");
    guestRecord = await guestsRepo.findById(guestSession.guestId);
  }

  const body = await req.json() as {
    guestName?: string;
    bookingId?: string;
    hotelId?: string;
    rating: number;
    title?: string;
    comment?: string;
  };

  if (!body.rating || body.rating < 1 || body.rating > 5) {
    return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
  }

  const guestName = body.guestName || guestRecord?.name || "Anonymous";
  const review = await reviews.create({
    guestId: guestSession?.guestId || undefined,
    guestName,
    bookingId: body.bookingId,
    hotelId: body.hotelId,
    rating: body.rating,
    title: body.title,
    comment: body.comment,
  });

  return NextResponse.json({ review }, { status: 201 });
}

export async function PATCH(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const body = await req.json() as { id: string; status: string; staffResponse?: string };
  if (!body.id || !body.status) {
    return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
  }
  const updated = await reviews.moderate(body.id, body.status, body.staffResponse);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ review: updated });
}
