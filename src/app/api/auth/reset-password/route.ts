import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { authAuditLogs, hotels, passwordResetTokens, ensureDbReady } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { getClientIP } from "@/lib/rateLimit";
import { checkRateLimitAsync } from "@/lib/rateLimitDistributed";
import { validateCsrf } from "@/lib/csrf";

const MIN_RESPONSE_MS = 450;

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function waitForMinimumDuration(startTime: number) {
  const elapsed = Date.now() - startTime;
  if (elapsed < MIN_RESPONSE_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_RESPONSE_MS - elapsed));
  }
}

export async function POST(req: Request) {
  const requestStart = Date.now();
  const csrfError = await validateCsrf(req);
  if (csrfError) return csrfError;

  const ip = getClientIP(req);
  const userAgent = req.headers.get("user-agent");

  const limit = await checkRateLimitAsync(`reset-password:${ip}`, { maxRequests: 5, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many attempts. Please wait." }, { status: 429 });
  }

  try {
    await ensureDbReady();

    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!token || password.length < 8) {
      await waitForMinimumDuration(requestStart);
      return NextResponse.json({ error: "Reset failed" }, { status: 400 });
    }

    const tokenHash = sha256(token);
    const activeToken = await passwordResetTokens.findActiveByHash(tokenHash);
    if (!activeToken) {
      await waitForMinimumDuration(requestStart);
      return NextResponse.json({ error: "Reset failed" }, { status: 400 });
    }

    const hotel = await hotels.findById(activeToken.hotel_id);
    if (!hotel) {
      await passwordResetTokens.markUsed(activeToken.id);
      await waitForMinimumDuration(requestStart);
      return NextResponse.json({ error: "Reset failed" }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);
    await hotels.updatePassword(hotel.id, hashedPassword);
    await hotels.bumpSessionVersion(hotel.id);
    await passwordResetTokens.markUsed(activeToken.id);
    await passwordResetTokens.invalidateActiveForHotel(hotel.id);
    await authAuditLogs.create({
      hotelId: hotel.id,
      email: hotel.email,
      event: "password_reset_success",
      ip,
      userAgent,
    });

    await waitForMinimumDuration(requestStart);
    return NextResponse.json({ success: true });
  } catch {
    await waitForMinimumDuration(requestStart);
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}
