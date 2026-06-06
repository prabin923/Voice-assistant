import { NextResponse } from "next/server";
import { hotels, authAuditLogs, ensureDbReady } from "@/lib/db";
import { verifyPassword, createToken, setSessionCookie } from "@/lib/auth";
import { getClientIP } from "@/lib/rateLimit";
import { checkRateLimitAsync } from "@/lib/rateLimitDistributed";
import { validateCsrf } from "@/lib/csrf";
import {
  clearFailedLogin,
  getLoginLockoutMs,
  registerFailedLogin,
} from "@/lib/loginLockout";

const MIN_RESPONSE_MS = 450;
const DUMMY_HASH = "$2b$10$5x9RFPfSOmQXfYWf5fR8NuoW2mNc3ON6rN7i6S9vDOMkMt2rtI8BG"; // bcrypt for "invalid-password"

async function waitForMinimumDuration(startTime: number) {
  const elapsed = Date.now() - startTime;
  if (elapsed < MIN_RESPONSE_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_RESPONSE_MS - elapsed));
  }
}

export async function POST(request: Request) {
  const requestStart = Date.now();
  const ip = getClientIP(request);
  const userAgent = request.headers.get("user-agent");

  try {
    await ensureDbReady();
    const csrfError = await validateCsrf(request);
    if (csrfError) return csrfError;

    // SECURITY: Rate limit login attempts — 5 per minute per IP
    const limit = await checkRateLimitAsync(`login:${ip}`, { maxRequests: 5, windowMs: 60000 });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please wait a moment." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } }
      );
    }

    const body = await request.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email : "";
    const password = typeof body?.password === "string" ? body.password : "";

    const normalizedEmail = email.toLowerCase().trim();
    const lockoutKey = `admin-login:${normalizedEmail}:${ip}`;
    const retryAfterMs = getLoginLockoutMs(lockoutKey);

    if (retryAfterMs > 0) {
      return NextResponse.json(
        { error: "Too many login attempts. Please wait a moment." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
      );
    }

    const hotel = await hotels.findByEmail(normalizedEmail);
    const passwordHash = hotel?.password ?? DUMMY_HASH;
    const valid = password.length > 0 ? await verifyPassword(password, passwordHash) : false;
    const isAuthenticated = Boolean(hotel) && valid;

    if (!isAuthenticated || !hotel) {
      registerFailedLogin(lockoutKey);
      await authAuditLogs.create({
        hotelId: hotel?.id ?? null,
        email: normalizedEmail || "unknown",
        event: "login_fail",
        ip,
        userAgent,
      });
      await waitForMinimumDuration(requestStart);
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    clearFailedLogin(lockoutKey);

    const sessionVersion = await hotels.bumpSessionVersion(hotel.id);
    const token = await createToken({
      hotelId: hotel.id,
      email: hotel.email,
      tokenVersion: sessionVersion,
    });
    await setSessionCookie(token);
    await authAuditLogs.create({
      hotelId: hotel.id,
      email: hotel.email,
      event: "login_success",
      ip,
      userAgent,
    });
    await waitForMinimumDuration(requestStart);

    return NextResponse.json({ id: hotel.id, name: hotel.name, email: hotel.email });
  } catch (err) {
    await waitForMinimumDuration(requestStart);
    if (err instanceof Error && err.message.includes("JWT_SECRET")) {
      return NextResponse.json(
        { error: "Server authentication is not configured. Set JWT_SECRET in Vercel and redeploy." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
