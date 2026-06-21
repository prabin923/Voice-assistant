import { NextResponse } from "next/server";
import { authAuditLogs, hotels, ensureDbReady } from "@/lib/db";
import { hashPassword, createToken, setSessionCookie } from "@/lib/auth";
import { checkRateLimit, getClientIP } from "@/lib/rateLimit";
import { validateCsrf } from "@/lib/csrf";
import { generateUniqueHotelSlug } from "@/lib/hotelSlug";
import { verifyInviteToken } from "@/lib/superAdminAuth";

const MIN_RESPONSE_MS = 450;

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

    // SECURITY: Rate limit registration — 3 per hour per IP
    const limit = checkRateLimit(`register:${ip}`, { maxRequests: 3, windowMs: 3600000 });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } }
      );
    }

    await ensureDbReady();

    const body = await request.json().catch(() => ({}));
    const name = typeof body?.name === "string" ? body.name : "";
    const email = typeof body?.email === "string" ? body.email : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const inviteToken = typeof body?.inviteToken === "string" ? body.inviteToken : "";

    if (process.env.NODE_ENV === "production" && process.env.ALLOW_ADMIN_REGISTRATION !== "true") {
      const validInvite = inviteToken ? await verifyInviteToken(inviteToken) : false;
      if (!validInvite) {
        await waitForMinimumDuration(requestStart);
        return NextResponse.json({ error: "Registration failed" }, { status: 403 });
      }
    }

    const trimmedName = name.trim();

    const normalizedEmail = email.toLowerCase().trim();

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validInput =
      trimmedName.length >= 2 &&
      trimmedName.length <= 100 &&
      emailRegex.test(normalizedEmail) &&
      password.length >= 8;
    if (!validInput) {
      await waitForMinimumDuration(requestStart);
      return NextResponse.json({ error: "Registration failed" }, { status: 400 });
    }

    const existing = await hotels.findByEmail(normalizedEmail);
    if (existing) {
      await waitForMinimumDuration(requestStart);
      return NextResponse.json({ error: "Registration failed" }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);
    const slug = await generateUniqueHotelSlug(trimmedName);
    const hotel = await hotels.create({
      name: trimmedName,
      email: normalizedEmail,
      password: hashedPassword,
      slug,
    });

    const token = await createToken({
      hotelId: hotel.id,
      email: hotel.email,
      tokenVersion: hotel.session_version,
    });
    await setSessionCookie(token);
    await authAuditLogs.create({
      hotelId: hotel.id,
      email: hotel.email,
      event: "register",
      ip,
      userAgent,
    });
    await waitForMinimumDuration(requestStart);

    return NextResponse.json({ id: hotel.id, name: hotel.name, email: hotel.email, slug }, { status: 201 });
  } catch {
    await waitForMinimumDuration(requestStart);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
