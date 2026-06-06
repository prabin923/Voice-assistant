"use client";

const CSRF_COOKIE = "csrf-token";
const CSRF_HEADER = "x-csrf-token";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split(";").map((v) => v.trim());
  const found = parts.find((entry) => entry.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}

function withCsrfHeaders(init?: RequestInit): RequestInit {
  const method = (init?.method || "GET").toUpperCase();
  const headers = new Headers(init?.headers || {});

  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const csrfToken = getCookie(CSRF_COOKIE);
    if (csrfToken && !headers.has(CSRF_HEADER)) {
      headers.set(CSRF_HEADER, csrfToken);
    }
  }

  return { ...init, headers, credentials: "include" };
}

export interface GuestProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  preferredLanguage: string;
  visitCount: number;
  messageCount: number;
  bookingCount: number;
  lastVisitAt: string | null;
  memberSince: string;
  loyaltyTier: "new" | "returning" | "loyal";
  loyaltyLabel: string;
}

export async function ensureGuestCsrf(): Promise<void> {
  await fetch("/api/auth/csrf", { credentials: "include" });
}

export async function fetchGuestMe(): Promise<GuestProfile | null> {
  const res = await fetch("/api/guest/auth/me", { credentials: "include" });
  if (res.status === 401) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to load guest profile");
  return data.guest as GuestProfile;
}

export async function guestRegister(input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  preferredLanguage?: string;
}): Promise<GuestProfile> {
  await ensureGuestCsrf();
  const res = await fetch("/api/guest/auth/register", withCsrfHeaders({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Registration failed");
  return data.guest as GuestProfile;
}

export async function guestLogin(email: string, password: string): Promise<GuestProfile> {
  await ensureGuestCsrf();
  const res = await fetch("/api/guest/auth/login", withCsrfHeaders({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Login failed");
  return data.guest as GuestProfile;
}

export async function guestLogout(): Promise<void> {
  await ensureGuestCsrf();
  await fetch("/api/guest/auth/logout", withCsrfHeaders({ method: "POST" }));
}
