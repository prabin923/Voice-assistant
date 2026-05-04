"use client";

const LOGIN_ROUTE = "/admin/login";
const SESSION_EXPIRED_REASON = "session-expired";
const UNAUTHORIZED_ERROR = "Unauthorized";

/**
 * Fetch JSON and automatically redirect to login on 401.
 */
export async function fetchJsonWithAuth<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);

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
