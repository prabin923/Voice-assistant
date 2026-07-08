import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { hotels } from "@/lib/db";
import { getJwtSecretBytes, hasProductionJwtSecret } from "@/lib/jwtSecret";
import { crossSiteCookieOptions } from "@/lib/cookieOptions";

const SESSION_COOKIE = "session";
const CSRF_COOKIE = "csrf-token";
const DAY_SECONDS = 60 * 60 * 24;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hashSync(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compareSync(password, hash);
}

export async function createToken(payload: { hotelId: string; email: string; tokenVersion: number }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getJwtSecretBytes());
}

export async function verifyToken(token: string): Promise<{ hotelId: string; email: string; tokenVersion: number } | null> {
  try {
    if (!hasProductionJwtSecret() && process.env.NODE_ENV === "production") return null;
    const { payload } = await jwtVerify(token, getJwtSecretBytes());
    if (payload.typ === "guest") return null;
    return payload as unknown as { hotelId: string; email: string; tokenVersion: number };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE,
    token,
    crossSiteCookieOptions({ httpOnly: true, maxAge: DAY_SECONDS }), // 24 hours (reduced from 7 days)
  );

  const csrfToken = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
  cookieStore.set(
    CSRF_COOKIE,
    csrfToken,
    crossSiteCookieOptions({ httpOnly: false, maxAge: DAY_SECONDS }),
  );
}

export async function ensureCsrfCookie() {
  const cookieStore = await cookies();
  const existing = cookieStore.get(CSRF_COOKIE)?.value;
  if (existing) return;

  const csrfToken = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
  cookieStore.set(
    CSRF_COOKIE,
    csrfToken,
    crossSiteCookieOptions({ httpOnly: false, maxAge: DAY_SECONDS }),
  );
}

export async function getSession(): Promise<{ hotelId: string; email: string; tokenVersion: number } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifyToken(token);
  if (!session) return null;

  const hotel = await hotels.findById(session.hotelId);
  if (!hotel || hotel.session_version !== session.tokenVersion) {
    return null;
  }

  return session;
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(CSRF_COOKIE);
}

/**
 * SECURITY: Reusable auth guard for API routes.
 * Returns the session if authenticated, or a 401 NextResponse if not.
 */
export async function requireAuth(): Promise<
  { session: { hotelId: string; email: string; tokenVersion: number }; error?: never } |
  { session?: never; error: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return {
      error: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      ),
    };
  }
  return { session };
}
