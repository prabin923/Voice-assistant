const DEV_FALLBACK = "dev-only-local-secret-do-not-use-in-prod";
const MIN_DEV_LENGTH = 8;
const MIN_PROD_LENGTH = 32;

function minSecretLength(): number {
  return process.env.NODE_ENV === "production" ? MIN_PROD_LENGTH : MIN_DEV_LENGTH;
}

/** Shared JWT secret bytes for auth routes and proxy (Next.js 16 middleware). */
export function getJwtSecretBytes(): Uint8Array {
  const raw = process.env.JWT_SECRET?.trim();
  const minLen = minSecretLength();
  if (raw && raw.length >= minLen) {
    return new TextEncoder().encode(raw);
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      `JWT_SECRET is missing or too short (min ${MIN_PROD_LENGTH} chars). Add it in Vercel → Project → Settings → Environment Variables, then redeploy.`
    );
  }
  return new TextEncoder().encode(DEV_FALLBACK);
}

export function hasProductionJwtSecret(): boolean {
  const raw = process.env.JWT_SECRET?.trim();
  return Boolean(raw && raw.length >= minSecretLength());
}
