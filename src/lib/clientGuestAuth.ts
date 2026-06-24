"use client";

/**
 * Guest auth client.
 *
 * The concierge runs inside a CROSS-ORIGIN <iframe> on the hotel's website,
 * where browsers (Brave/Safari, and Chrome going forward) block third-party
 * cookies. So the guest session cannot ride on a cookie. Instead the server
 * returns a session token in the login/register response body; we persist it in
 * localStorage (partitioned per top-level site inside the iframe) and send it as
 * `Authorization: Bearer <token>` on every authenticated request.
 */
const GUEST_TOKEN_KEY = "staynep_guest_token";

export function getGuestToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(GUEST_TOKEN_KEY);
  } catch {
    return null;
  }
}

function setGuestToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GUEST_TOKEN_KEY, token);
  } catch {
    /* storage unavailable (private mode / blocked) — auth degrades to this session only */
  }
}

function clearGuestToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(GUEST_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Build headers carrying the guest Bearer token. Exported so other in-iframe
 * callers (chat, STT, feedback) can authenticate the guest too.
 */
export function guestAuthHeaders(base?: HeadersInit): Headers {
  const headers = new Headers(base || {});
  const token = getGuestToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
}

function withAuth(init?: RequestInit): RequestInit {
  return { ...init, headers: guestAuthHeaders(init?.headers), credentials: "include" };
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

export async function fetchGuestMe(): Promise<GuestProfile | null> {
  const res = await fetch("/api/guest/auth/me", withAuth());
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
  const res = await fetch("/api/guest/auth/register", withAuth({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Registration failed");
  if (data.token) setGuestToken(data.token as string);
  return data.guest as GuestProfile;
}

export async function guestLogin(email: string, password: string): Promise<GuestProfile> {
  const res = await fetch("/api/guest/auth/login", withAuth({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Login failed");
  if (data.token) setGuestToken(data.token as string);
  return data.guest as GuestProfile;
}

export async function guestLogout(): Promise<void> {
  try {
    await fetch("/api/guest/auth/logout", withAuth({ method: "POST" }));
  } finally {
    clearGuestToken();
  }
}

export interface GuestBooking {
  id: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  guestName: string;
  status: string;
  createdAt: string;
}

export async function fetchGuestBookings(): Promise<GuestBooking[]> {
  const res = await fetch("/api/guest/bookings", withAuth());
  if (res.status === 401) return [];
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to load bookings");
  return (data.bookings ?? []) as GuestBooking[];
}

export async function cancelGuestBooking(id: string): Promise<void> {
  const res = await fetch(`/api/guest/bookings/${id}`, withAuth({
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "cancel" }),
  }));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to cancel booking");
}
