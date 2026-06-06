import { NextResponse } from "next/server";
import { clearSession, getSession } from "@/lib/auth";
import { hotels, ensureDbReady } from "@/lib/db";

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

  return NextResponse.json({
    id: hotel.id,
    name: hotel.name,
    email: hotel.email,
    createdAt: hotel.created_at,
  });
}
