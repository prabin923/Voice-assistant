import { NextResponse } from "next/server";
import { hotels } from "@/lib/db";
import { verifyPassword, createToken, setSessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const hotel = hotels.findByEmail(email);
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
