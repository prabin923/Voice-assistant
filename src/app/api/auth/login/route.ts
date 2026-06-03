import { NextResponse } from "next/server";
import { hotels } from "@/lib/db";
import { verifyPassword, createToken, setSessionCookie } from "@/lib/auth";
import { checkRateLimit, getClientIP } from "@/lib/rateLimit";
import { validateCsrf } from "@/lib/csrf";
import { authAuditLogs } from "@/lib/db";

const FAILED_WINDOW_MS = 15 * 60 * 1000;
const BASE_LOCKOUT_MS = 60 * 1000;
const MAX_LOCKOUT_MS = 30 * 60 * 1000;
const FAILURE_THRESHOLD = 5;
const MIN_RESPONSE_MS = 450;
const DUMMY_HASH = "$2b$10$5x9RFPfSOmQXfYWf5fR8NuoW2mNc3ON6rN7i6S9vDOMkMt2rtI8BG"; // bcrypt for "invalid-password"

interface FailedLoginState {
  count: number;
  windowStart: number;
  lockUntil: number;
}

const failedLoginStore = new Map<string, FailedLoginState>();

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of failedLoginStore) {
    if (value.lockUntil <= now && value.windowStart + FAILED_WINDOW_MS <= now) {
      failedLoginStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

function getLockoutDurationMs(failureCount: number): number {
  const overThreshold = Math.max(0, failureCount - FAILURE_THRESHOLD);
  const duration = BASE_LOCKOUT_MS * (2 ** overThreshold);
  return Math.min(duration, MAX_LOCKOUT_MS);
}

function registerFailedAttempt(key: string): number {
  const now = Date.now();
  const previous = failedLoginStore.get(key);
  const freshWindow = !previous || now - previous.windowStart > FAILED_WINDOW_MS;
  const count = freshWindow ? 1 : previous.count + 1;
  const windowStart = freshWindow ? now : previous.windowStart;
  const lockoutMs = count >= FAILURE_THRESHOLD ? getLockoutDurationMs(count) : 0;
  const lockUntil = lockoutMs > 0 ? now + lockoutMs : 0;

  failedLoginStore.set(key, { count, windowStart, lockUntil });
  return lockoutMs;
}

function clearFailedAttempts(key: string) {
  failedLoginStore.delete(key);
}

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
    const csrfError = await validateCsrf(request);
    if (csrfError) return csrfError;

    // SECURITY: Rate limit login attempts — 5 per minute per IP
    const limit = checkRateLimit(`login:${ip}`, { maxRequests: 5, windowMs: 60000 });
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
    const lockoutKey = `login-lockout:${normalizedEmail}:${ip}`;
    const now = Date.now();
    const existingFailureState = failedLoginStore.get(lockoutKey);

    if (existingFailureState && existingFailureState.lockUntil > now) {
      const retryAfterMs = existingFailureState.lockUntil - now;
      return NextResponse.json(
        { error: "Too many login attempts. Please wait a moment." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
      );
    }

    const hotel = hotels.findByEmail(normalizedEmail);
    const passwordHash = hotel?.password ?? DUMMY_HASH;
    const valid = password.length > 0 ? await verifyPassword(password, passwordHash) : false;
    const isAuthenticated = Boolean(hotel) && valid;

    if (!isAuthenticated || !hotel) {
      registerFailedAttempt(lockoutKey);
      authAuditLogs.create({
        hotelId: hotel?.id ?? null,
        email: normalizedEmail || "unknown",
        event: "login_fail",
        ip,
        userAgent,
      });
      await waitForMinimumDuration(requestStart);
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    clearFailedAttempts(lockoutKey);

    const sessionVersion = hotels.bumpSessionVersion(hotel.id);
    const token = await createToken({
      hotelId: hotel.id,
      email: hotel.email,
      tokenVersion: sessionVersion,
    });
    await setSessionCookie(token);
    authAuditLogs.create({
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
