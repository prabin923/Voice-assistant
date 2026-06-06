import { NextResponse } from "next/server";
import { validateCsrf } from "@/lib/csrf";
import { checkRateLimit, getClientIP } from "@/lib/rateLimit";
import {
  loginGuest,
  publicGuestProfile,
  registerGuest,
  setGuestSessionCookie,
  clearGuestSession,
  getGuestSession,
} from "@/lib/guestAuth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip = getClientIP(req);
  const limit = checkRateLimit(`guest-register:${ip}`, { maxRequests: 5, windowMs: 60 * 60 * 1000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many registration attempts. Try again later." }, { status: 429 });
  }

  const csrfError = await validateCsrf(req);
  if (csrfError) return csrfError;

  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const password = String(body.password || "");
    const phone = String(body.phone || "").trim();
    const preferredLanguage = String(body.preferredLanguage || "en-US").trim();

    if (!name || !email || password.length < 8) {
      return NextResponse.json(
        { error: "Name, email, and password (min 8 characters) are required." },
        { status: 400 }
      );
    }

    const { guest, token } = await registerGuest({
      name,
      email,
      password,
      phone: phone || undefined,
      preferredLanguage,
    });

    await setGuestSessionCookie(token);
    return NextResponse.json({ success: true, guest: publicGuestProfile(guest) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Registration failed";
    const status = message.includes("already registered") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
