import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { authAuditLogs, hotels, passwordResetTokens } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { getClientIP } from "@/lib/rateLimit";
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

  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!token || password.length < 8) {
      await waitForMinimumDuration(requestStart);
      return NextResponse.json({ error: "Reset failed" }, { status: 400 });
    }

    const tokenHash = sha256(token);
    const activeToken = passwordResetTokens.findActiveByHash(tokenHash);
    if (!activeToken) {
      await waitForMinimumDuration(requestStart);
      return NextResponse.json({ error: "Reset failed" }, { status: 400 });
    }

    const hotel = hotels.findById(activeToken.hotel_id);
    if (!hotel) {
      passwordResetTokens.markUsed(activeToken.id);
      await waitForMinimumDuration(requestStart);
      return NextResponse.json({ error: "Reset failed" }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);
    hotels.updatePassword(hotel.id, hashedPassword);
    hotels.bumpSessionVersion(hotel.id);
    passwordResetTokens.markUsed(activeToken.id);
    passwordResetTokens.invalidateActiveForHotel(hotel.id);
    authAuditLogs.create({
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
