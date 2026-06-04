const ALLOWED_REDIRECTS = new Set(["/settings", "/assistant"]);

/** Only allow internal app paths for post-auth redirects. */
export function getSafeRedirect(path: string | null | undefined, fallback = "/settings"): string {
  if (!path) return fallback;
  if (ALLOWED_REDIRECTS.has(path)) return path;
  if (path.startsWith("/settings/")) return path;
  return fallback;
}
