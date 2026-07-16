import { NextResponse } from "next/server";
import { getGuestSession } from "@/lib/guestAuth";
import { getGuestPreferences, updateGuestPreferences } from "@/lib/guestPreferences";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getGuestSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const prefs = await getGuestPreferences(session.guestId);
  return NextResponse.json({ preferences: prefs });
}

export async function PUT(req: Request) {
  const session = await getGuestSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const body = await req.json() as Parameters<typeof updateGuestPreferences>[1];
  const updated = await updateGuestPreferences(session.guestId, body);
  return NextResponse.json({ preferences: updated });
}
