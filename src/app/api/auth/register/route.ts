import { NextResponse } from "next/server";
import { hotels } from "@/lib/db";
import { hashPassword, createToken, setSessionCookie } from "@/lib/auth";
import { checkRateLimit, getClientIP } from "@/lib/rateLimit";

export async function POST(request: Request) {
  try {
    // SECURITY: Rate limit registration — 3 per hour per IP
    const ip = getClientIP(request);
    const limit = checkRateLimit(`register:${ip}`, { maxRequests: 10, windowMs: 3600000 });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } }
      );
    }

    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }

    if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // Validate name length
    if (name.trim().length < 2 || name.trim().length > 100) {
      return NextResponse.json({ error: "Name must be between 2 and 100 characters" }, { status: 400 });
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = hotels.findByEmail(normalizedEmail);
    if (existing) {
      // SECURITY: Don't reveal whether an email exists — use generic error
      return NextResponse.json({ error: "Registration failed. Please try a different email." }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);
    const hotel = hotels.create({ name: name.trim(), email: normalizedEmail, password: hashedPassword });

    const token = await createToken({ hotelId: hotel.id, email: hotel.email });
    await setSessionCookie(token);

    return NextResponse.json({ id: hotel.id, name: hotel.name, email: hotel.email }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
