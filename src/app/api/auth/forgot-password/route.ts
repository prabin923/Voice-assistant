import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { authAuditLogs, hotels, passwordResetTokens, ensureDbReady } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { checkRateLimit, getClientIP } from "@/lib/rateLimit";
import { validateCsrf } from "@/lib/csrf";

const GENERIC_RESPONSE = { success: true, message: "If an account exists, reset instructions were sent." };
const MIN_RESPONSE_MS = 450;
const RESET_TOKEN_TTL_MINUTES = 30;

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

  const limit = checkRateLimit(`forgot-password:${ip}`, { maxRequests: 5, windowMs: 60 * 60 * 1000 });
  if (!limit.allowed) {
    await waitForMinimumDuration(requestStart);
    return NextResponse.json(GENERIC_RESPONSE);
  }

  try {
    await ensureDbReady();

    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";

    if (!email) {
      await waitForMinimumDuration(requestStart);
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const hotel = await hotels.findByEmail(email);
    if (hotel) {
      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = sha256(rawToken);
      const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60_000).toISOString();

      await passwordResetTokens.invalidateActiveForHotel(hotel.id);
      await passwordResetTokens.create({ hotelId: hotel.id, tokenHash, expiresAt });

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
      const resetUrl = `${baseUrl}/admin/reset-password?token=${encodeURIComponent(rawToken)}`;
      await sendPasswordResetEmail({
        toEmail: hotel.email,
        hotelName: hotel.name,
        resetUrl,
      });

      await authAuditLogs.create({
        hotelId: hotel.id,
        email: hotel.email,
        event: "password_reset_request",
        ip,
        userAgent,
      });
    }

    await waitForMinimumDuration(requestStart);
    return NextResponse.json(GENERIC_RESPONSE);
  } catch {
    await waitForMinimumDuration(requestStart);
    return NextResponse.json(GENERIC_RESPONSE);
  }
}
