import { NextResponse } from "next/server";
import { getGuestSession, publicGuestProfile } from "@/lib/guestAuth";
import { guests } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getGuestSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const guest = guests.findById(session.guestId);
  if (!guest) {
    return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  }

  return NextResponse.json({ guest: publicGuestProfile(guest) });
}
