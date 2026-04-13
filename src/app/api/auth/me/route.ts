import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hotels } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const hotel = hotels.findById(session.hotelId);
  if (!hotel) {
    return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: hotel.id,
    name: hotel.name,
    email: hotel.email,
    createdAt: hotel.created_at,
  });
}
