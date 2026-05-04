"use client";

const LOGIN_ROUTE = "/admin/login";

/**
 * Fetch JSON and automatically redirect to login on 401.
 */
export async function fetchJsonWithAuth<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = LOGIN_ROUTE;
    }
    throw new Error("Unauthorized");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof data?.error === "string" ? data.error : "Request failed";
    throw new Error(message);
  }

  return data as T;
}
