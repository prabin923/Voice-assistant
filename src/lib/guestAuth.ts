import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { guests } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { getJwtSecretBytes, hasProductionJwtSecret } from "@/lib/jwtSecret";

export const GUEST_SESSION_COOKIE = "guest_session";

export type GuestSession = {
  guestId: string;
  email: string;
  tokenVersion: number;
};

export type GuestLoyaltyTier = "new" | "returning" | "loyal";

export function getGuestLoyaltyTier(visitCount: number): GuestLoyaltyTier {
  if (visitCount >= 10) return "loyal";
  if (visitCount >= 2) return "returning";
  return "new";
}

export async function createGuestToken(payload: GuestSession): Promise<string> {
  return new SignJWT({ ...payload, typ: "guest" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getJwtSecretBytes());
}

export async function verifyGuestToken(token: string): Promise<GuestSession | null> {
  try {
    if (!hasProductionJwtSecret() && process.env.NODE_ENV === "production") return null;
    const { payload } = await jwtVerify(token, getJwtSecretBytes());
    if (payload.typ !== "guest") return null;
    return payload as unknown as GuestSession;
  } catch {
    return null;
  }
}

export async function setGuestSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(GUEST_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearGuestSession() {
  const cookieStore = await cookies();
  cookieStore.delete(GUEST_SESSION_COOKIE);
}

export async function getGuestSession(): Promise<GuestSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(GUEST_SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await verifyGuestToken(token);
  if (!session) return null;

  const guest = guests.findById(session.guestId);
  if (!guest || guest.session_version !== session.tokenVersion) return null;

  return session;
}

export async function requireGuestAuth(): Promise<
  { session: GuestSession; error?: never } | { session?: never; error: NextResponse }
> {
  const session = await getGuestSession();
  if (!session) {
    return {
      error: NextResponse.json({ error: "Guest sign-in required." }, { status: 401 }),
    };
  }
  return { session };
}

export async function registerGuest(input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  preferredLanguage?: string;
}) {
  const email = input.email.trim().toLowerCase();
  if (!email || !input.name.trim() || input.password.length < 8) {
    throw new Error("Invalid registration data");
  }
  if (guests.findByEmail(email)) {
    throw new Error("Email already registered");
  }

  const guest = guests.create({
    name: input.name.trim(),
    email,
    password: await hashPassword(input.password),
    phone: input.phone?.trim() || null,
    preferredLanguage: input.preferredLanguage || "en-US",
  });

  const token = await createGuestToken({
    guestId: guest.id,
    email: guest.email,
    tokenVersion: guest.session_version,
  });

  return { guest, token };
}

export async function loginGuest(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  const guest = guests.findByEmail(normalized);
  if (!guest || !(await verifyPassword(password, guest.password))) {
    throw new Error("Invalid credentials");
  }

  guests.recordVisit(guest.id);
  const refreshed = guests.findById(guest.id)!;
  const token = await createGuestToken({
    guestId: refreshed.id,
    email: refreshed.email,
    tokenVersion: refreshed.session_version,
  });

  return { guest: refreshed, token };
}

export function publicGuestProfile(guest: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  preferred_language: string;
  visit_count: number;
  message_count: number;
  booking_count: number;
  last_visit_at: string | null;
  created_at: string;
}) {
  const tier = getGuestLoyaltyTier(guest.visit_count);
  return {
    id: guest.id,
    name: guest.name,
    email: guest.email,
    phone: guest.phone,
    preferredLanguage: guest.preferred_language,
    visitCount: guest.visit_count,
    messageCount: guest.message_count,
    bookingCount: guest.booking_count,
    lastVisitAt: guest.last_visit_at,
    memberSince: guest.created_at,
    loyaltyTier: tier,
    loyaltyLabel:
      tier === "loyal" ? "Loyal Guest" : tier === "returning" ? "Returning Guest" : "New Guest",
  };
}
