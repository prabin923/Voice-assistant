import { NextResponse } from "next/server";
import { clearSession, getSession } from "@/lib/auth";
import { hotels, ensureDbReady } from "@/lib/db";
import { ensureHotelHasSlug } from "@/lib/hotelSlug";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  await ensureDbReady();
  const hotel = await hotels.findById(session.hotelId);
  if (!hotel) {
    await clearSession();
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const slug = await ensureHotelHasSlug(hotel.id, hotel.name);

  return NextResponse.json({
    id: hotel.id,
    name: hotel.name,
    email: hotel.email,
    slug,
    createdAt: hotel.created_at,
  });
}
