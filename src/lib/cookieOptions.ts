/**
 * Cookie options for auth cookies that must work inside the embedded
 * concierge, which runs in a CROSS-ORIGIN <iframe> on the hotel's website.
 *
 * Browsers treat a cross-site iframe as a third-party context and will only
 * store/send cookies marked `SameSite=None; Secure`. `Strict`/`Lax` cookies are
 * silently dropped there, which breaks the CSRF double-submit token (the
 * `csrf-token` cookie is never stored, so no `x-csrf-token` header can be sent)
 * and prevents the session cookie from persisting.
 *
 * `SameSite=None` requires `Secure`. We therefore set `Secure` in every
 * environment — including local dev over plain HTTP — because browsers treat
 * `http://localhost` as a secure context and DO store `Secure` cookies there.
 * This lets the embed be tested cross-site on localhost (use Chrome or Firefox;
 * Safari blocks all third-party cookies regardless of attributes). The only
 * setup where this fails is serving the app over plain HTTP on a non-localhost
 * host — use HTTPS (or a tunnel) for that.
 */
export function crossSiteCookieOptions(opts: {
  httpOnly: boolean;
  maxAge: number;
}): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "none";
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: opts.httpOnly,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: opts.maxAge,
  };
}
