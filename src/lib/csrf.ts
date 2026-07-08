import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const CSRF_COOKIE = "csrf-token";
const CSRF_HEADER = "x-csrf-token";

/**
 * Validate CSRF for state-changing requests.
 * - Origin must match request origin (when provided by the client).
 * - Double-submit token must match cookie and header.
 */
export async function validateCsrf(request: Request): Promise<NextResponse | null> {
  const origin = request.headers.get("origin");
  if (origin) {
    const requestOrigin = new URL(request.url).origin;
    if (origin !== requestOrigin) {
      return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    }
  }

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE)?.value;
  const headerToken = request.headers.get(CSRF_HEADER);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  return null;
}

/**
 * CSRF defense for endpoints used by the embedded widget (a cross-site
 * <iframe>). The double-submit cookie pattern in validateCsrf cannot work there
 * because browsers (Brave/Safari, and Chrome going forward) block third-party
 * cookies, so the `csrf-token` cookie is never stored.
 *
 * Instead we verify the request's Origin (falling back to Referer) matches the
 * app's own origin. Requests issued from inside the widget iframe are
 * same-origin to the API (the iframe is served from this app), so they pass;
 * a forged cross-origin request from an attacker page carries a foreign Origin
 * and is rejected. Combined with Bearer-token auth (no ambient cookies sent
 * cross-site), this closes the CSRF vector.
 */
export async function validateSameOrigin(request: Request): Promise<NextResponse | null> {
  const requestOrigin = new URL(request.url).origin;

  const origin = request.headers.get("origin");
  if (origin) {
    return origin === requestOrigin
      ? null
      : NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  // Some same-origin POSTs omit Origin; fall back to Referer.
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin === requestOrigin
        ? null
        : NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    } catch {
      return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    }
  }

  return NextResponse.json({ error: "Missing request origin" }, { status: 403 });
}
