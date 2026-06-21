import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getJwtSecretBytes } from "@/lib/jwtSecret";

const SA_COOKIE = "sa-session";

function getSAKeyBytes(): Uint8Array {
  const key = process.env.SUPER_ADMIN_KEY?.trim();
  if (!key || key.length < 16) throw new Error("SUPER_ADMIN_KEY not configured");
  return new TextEncoder().encode(key);
}

export function isSuperAdminConfigured(): boolean {
  const key = process.env.SUPER_ADMIN_KEY?.trim();
  return Boolean(key && key.length >= 16);
}

export function verifySuperAdminKey(input: string): boolean {
  const key = process.env.SUPER_ADMIN_KEY?.trim();
  if (!key || key.length < 16) return false;
  return input.trim() === key;
}

export async function createSAToken(): Promise<string> {
  return new SignJWT({ type: "superadmin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(getSAKeyBytes());
}

async function verifySAToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getSAKeyBytes());
    return payload.type === "superadmin";
  } catch {
    return false;
  }
}

export async function getSASession(): Promise<boolean> {
  try {
    if (!isSuperAdminConfigured()) return false;
    const cookieStore = await cookies();
    const token = cookieStore.get(SA_COOKIE)?.value;
    if (!token) return false;
    return verifySAToken(token);
  } catch {
    return false;
  }
}

export async function setSACookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SA_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearSACookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SA_COOKIE);
}

export async function requireSAAuth(): Promise<
  { ok: true } | { ok: false; error: NextResponse }
> {
  if (!isSuperAdminConfigured()) {
    return {
      ok: false,
      error: NextResponse.json(
        { error: "Super-admin not configured. Set SUPER_ADMIN_KEY (min 16 chars) in your environment." },
        { status: 503 }
      ),
    };
  }
  const ok = await getSASession();
  if (!ok) {
    return {
      ok: false,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true };
}

// ── Invite tokens (signed with JWT_SECRET, 7-day expiry) ──────────────────────

export async function generateInviteToken(): Promise<string> {
  return new SignJWT({ type: "hotel-invite" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecretBytes());
}

export async function verifyInviteToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretBytes());
    return payload.type === "hotel-invite";
  } catch {
    return false;
  }
}
