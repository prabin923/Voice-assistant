import { NextResponse } from "next/server";
import { validateCsrf } from "@/lib/csrf";
import { getClientIP } from "@/lib/rateLimit";
import { checkRateLimitAsync } from "@/lib/rateLimitDistributed";
import {
  clearFailedLogin,
  getLoginLockoutMs,
  registerFailedLogin,
} from "@/lib/loginLockout";
import { loginGuest, publicGuestProfile, setGuestSessionCookie } from "@/lib/guestAuth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip = getClientIP(req);
  const limit = await checkRateLimitAsync(`guest-login:${ip}`, { maxRequests: 10, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many login attempts. Please wait." }, { status: 429 });
  }

  const csrfError = await validateCsrf(req);
  if (csrfError) return csrfError;

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim();
  const password = String(body.password || "");
  const normalizedEmail = email.toLowerCase();
  const lockoutKey = `guest-login:${normalizedEmail}:${ip}`;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const retryAfterMs = getLoginLockoutMs(lockoutKey);
  if (retryAfterMs > 0) {
    return NextResponse.json(
      { error: "Too many login attempts. Please wait." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
    );
  }

  try {
    const { guest, token } = await loginGuest(email, password);
    clearFailedLogin(lockoutKey);
    await setGuestSessionCookie(token);
    return NextResponse.json({ success: true, guest: publicGuestProfile(guest) });
  } catch {
    registerFailedLogin(lockoutKey);
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
}
