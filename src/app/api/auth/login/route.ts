import { NextResponse } from "next/server";
import { hotels } from "@/lib/db";
import { verifyPassword, createToken, setSessionCookie } from "@/lib/auth";
import { checkRateLimit, getClientIP } from "@/lib/rateLimit";

export async function POST(request: Request) {
  try {
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

    const hotel = hotels.findByEmail(email.toLowerCase().trim());
    if (!hotel) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const valid = await verifyPassword(password, hotel.password);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = await createToken({ hotelId: hotel.id, email: hotel.email });
    await setSessionCookie(token);

    return NextResponse.json({ id: hotel.id, name: hotel.name, email: hotel.email });
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
