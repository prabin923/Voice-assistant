const DEV_FALLBACK = "dev-only-local-secret-do-not-use-in-prod";

/** Shared JWT secret bytes for auth routes and proxy (Next.js 16 middleware). */
export function getJwtSecretBytes(): Uint8Array {
  const raw = process.env.JWT_SECRET?.trim();
  if (raw && raw.length >= 8) {
    return new TextEncoder().encode(raw);
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET is missing or too short (min 8 chars). Add it in Vercel → Project → Settings → Environment Variables, then redeploy."
    );
  }
  return new TextEncoder().encode(DEV_FALLBACK);
}

export function hasProductionJwtSecret(): boolean {
  const raw = process.env.JWT_SECRET?.trim();
  return Boolean(raw && raw.length >= 8);
}
