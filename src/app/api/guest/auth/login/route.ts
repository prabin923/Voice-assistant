import { NextResponse } from "next/server";
import { validateCsrf } from "@/lib/csrf";
import { checkRateLimit, getClientIP } from "@/lib/rateLimit";
import { loginGuest, publicGuestProfile, setGuestSessionCookie } from "@/lib/guestAuth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip = getClientIP(req);
  const limit = checkRateLimit(`guest-login:${ip}`, { maxRequests: 10, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many login attempts. Please wait." }, { status: 429 });
  }

  const csrfError = await validateCsrf(req);
  if (csrfError) return csrfError;

  try {
    const body = await req.json();
    const email = String(body.email || "").trim();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const { guest, token } = await loginGuest(email, password);
    await setGuestSessionCookie(token);
    return NextResponse.json({ success: true, guest: publicGuestProfile(guest) });
  } catch {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
}
