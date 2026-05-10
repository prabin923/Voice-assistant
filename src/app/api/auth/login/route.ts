import { NextResponse } from "next/server";
import { hotels } from "@/lib/db";
import { verifyPassword, createToken, setSessionCookie } from "@/lib/auth";
import { checkRateLimit, getClientIP } from "@/lib/rateLimit";
import { validateCsrf } from "@/lib/csrf";

const FAILED_WINDOW_MS = 15 * 60 * 1000;
const BASE_LOCKOUT_MS = 60 * 1000;
const MAX_LOCKOUT_MS = 30 * 60 * 1000;
const FAILURE_THRESHOLD = 5;

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

export async function POST(request: Request) {
  try {
    const csrfError = await validateCsrf(request);
    if (csrfError) return csrfError;

    // SECURITY: Rate limit login attempts — 5 per minute per IP
    const ip = getClientIP(request);
    const limit = checkRateLimit(`login:${ip}`, { maxRequests: 5, windowMs: 60000 });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please wait a moment." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

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
    if (!hotel) {
      registerFailedAttempt(lockoutKey);
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const valid = await verifyPassword(password, hotel.password);
    if (!valid) {
      registerFailedAttempt(lockoutKey);
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    clearFailedAttempts(lockoutKey);

    const token = await createToken({ hotelId: hotel.id, email: hotel.email });
    await setSessionCookie(token);

    return NextResponse.json({ id: hotel.id, name: hotel.name, email: hotel.email });
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
