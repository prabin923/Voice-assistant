"use client";

const LOGIN_ROUTE = "/admin/login";
const SESSION_EXPIRED_REASON = "session-expired";
const UNAUTHORIZED_ERROR = "Unauthorized";
const CSRF_COOKIE = "csrf-token";
const CSRF_HEADER = "x-csrf-token";
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split(";").map((v) => v.trim());
  const found = parts.find((entry) => entry.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}

function withCsrfHeaders(init?: RequestInit): RequestInit | undefined {
  const method = (init?.method || "GET").toUpperCase();
  if (!MUTATING_METHODS.has(method)) return init;

  const csrfToken = getCookie(CSRF_COOKIE);
  if (!csrfToken) return init;

  const headers = new Headers(init?.headers || {});
  if (!headers.has(CSRF_HEADER)) {
    headers.set(CSRF_HEADER, csrfToken);
  }

  return { ...init, headers };
}

/**
 * Fetch JSON and automatically redirect to login on 401.
 */
export async function fetchJsonWithAuth<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, withCsrfHeaders(init));

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      const loginUrl = new URL(LOGIN_ROUTE, window.location.origin);
      loginUrl.searchParams.set("reason", SESSION_EXPIRED_REASON);
      window.location.href = loginUrl.toString();
    }
    throw new Error(UNAUTHORIZED_ERROR);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof data?.error === "string" ? data.error : "Request failed";
    throw new Error(message);
  }

  return data as T;
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof Error && error.message === UNAUTHORIZED_ERROR;
}
