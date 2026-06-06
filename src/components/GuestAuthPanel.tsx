"use client";

import { useEffect, useState } from "react";
import { Loader2, LogIn, LogOut, User, X, XCircle } from "lucide-react";
import {
  cancelGuestBooking,
  fetchGuestBookings,
  fetchGuestMe,
  guestLogin,
  guestLogout,
  guestRegister,
  type GuestBooking,
  type GuestProfile,
} from "@/lib/clientGuestAuth";
import { vapiInputCls } from "@/lib/vapiUi";

interface Props {
  /** @deprecated Vapi theme is dark-only; kept for call-site compatibility */
  isDark?: boolean;
  guest: GuestProfile | null;
  onGuestChange: (guest: GuestProfile | null) => void;
  preferredLanguage?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  onAuthenticated?: (guest: GuestProfile) => void;
  allowSkip?: boolean;
  skipLabel?: string;
  onSkip?: () => void;
  title?: string;
  description?: string;
}

export function GuestAuthPanel({
  guest,
  onGuestChange,
  preferredLanguage = "en-US",
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
  onAuthenticated,
  allowSkip = false,
  skipLabel = "Continue without signing in",
  onSkip,
  title,
  description,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestBookings, setGuestBookings] = useState<GuestBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (!guest || !open) return;
    setBookingsLoading(true);
    void fetchGuestBookings()
      .then(setGuestBookings)
      .catch(() => setGuestBookings([]))
      .finally(() => setBookingsLoading(false));
  }, [guest, open]);

  const tierBadge =
    guest?.loyaltyTier === "loyal"
      ? "border-ember-orange/30 bg-ember-orange/10 text-ember-orange"
      : guest?.loyaltyTier === "returning"
        ? "border-mint-pulse/30 bg-mint-pulse/10 text-mint-pulse"
        : "border-iron-border bg-slab-elevated text-zinc-mute";

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const profile =
        mode === "login"
          ? await guestLogin(email, password)
          : await guestRegister({
              name,
              email,
              password,
              phone: phone || undefined,
              preferredLanguage,
            });
      onGuestChange(profile);
      setOpen(false);
      setPassword("");
      onAuthenticated?.(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await guestLogout();
      onGuestChange(null);
      setGuestBookings([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async (id: string) => {
    setCancellingId(id);
    try {
      await cancelGuestBooking(id);
      setGuestBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel booking");
    } finally {
      setCancellingId(null);
    }
  };

  const formatStay = (checkIn: string, checkOut: string) => {
    const fmt = (v: string) =>
      new Date(`${v}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return `${fmt(checkIn)} → ${fmt(checkOut)}`;
  };

  return (
    <>
      {!hideTrigger ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-[5.6px] border border-iron-border bg-carbon-surface px-3 py-2 font-mono text-xs uppercase tracking-widest text-bone-text transition-colors hover:border-steel-border hover:text-cream-text"
        >
          <User className="h-4 w-4" strokeWidth={1.5} />
          {guest ? guest.name.split(" ")[0] : "Sign in"}
        </button>
      ) : null}

      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-void-canvas/80 p-4">
          <div className="w-full max-w-md rounded-[5.6px] border border-iron-border bg-carbon-surface p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-medium text-cream-text">
                  {guest
                    ? "Guest profile"
                    : title ?? (mode === "login" ? "Guest sign in" : "Create guest account")}
                </h2>
                <p className="mt-1 text-sm text-zinc-mute">
                  {guest
                    ? "Your visits and bookings are saved for a smoother stay."
                    : description ?? "Sign in for higher limits and loyalty tracking."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-[5.6px] p-2 text-zinc-mute transition-colors hover:bg-slab-elevated hover:text-cream-text"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            {guest ? (
              <div className="space-y-4">
                <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-wider ${tierBadge}`}>
                  {guest.loyaltyLabel}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: "Visits", value: guest.visitCount },
                    { label: "Messages", value: guest.messageCount },
                    { label: "Bookings", value: guest.bookingCount },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-[5.6px] border border-iron-border bg-slab-elevated p-3">
                      <p className="text-lg font-medium text-cream-text">{stat.value}</p>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-mute">{stat.label}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-[5.6px] border border-iron-border bg-slab-elevated p-4 text-sm text-bone-text">
                  <p><span className="text-zinc-mute">Email:</span> {guest.email}</p>
                  {guest.phone ? <p className="mt-1"><span className="text-zinc-mute">Phone:</span> {guest.phone}</p> : null}
                </div>
                <div className="space-y-2">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-mute">Your bookings</p>
                  {bookingsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-zinc-mute">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading…
                    </div>
                  ) : guestBookings.length === 0 ? (
                    <p className="text-sm text-zinc-mute">No bookings linked to your account yet.</p>
                  ) : (
                    <ul className="max-h-40 space-y-2 overflow-y-auto">
                      {guestBookings.map((b) => (
                        <li key={b.id} className="rounded-[5.6px] border border-iron-border bg-slab-elevated p-3 text-sm">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-cream-text">{b.roomType}</p>
                              <p className="text-xs text-zinc-mute">{formatStay(b.checkIn, b.checkOut)}</p>
                              <p className="mt-1 text-xs capitalize text-zinc-mute">{b.status}</p>
                            </div>
                            {b.status === "confirmed" ? (
                              <button
                                type="button"
                                onClick={() => void cancelBooking(b.id)}
                                disabled={cancellingId === b.id}
                                className="inline-flex items-center gap-1 rounded-[5.6px] border border-red-500/30 px-2 py-1 text-[10px] uppercase tracking-wider text-red-400"
                              >
                                {cancellingId === b.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <XCircle className="h-3 w-3" />
                                )}
                                Cancel
                              </button>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void logout()}
                  disabled={loading}
                  className="vapi-ghost-btn w-full justify-center"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" strokeWidth={1.5} />}
                  Sign out
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-2">
                  {(["login", "register"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setMode(tab)}
                      className={`flex-1 rounded-[5.6px] border py-2 font-mono text-xs uppercase tracking-widest transition-colors ${
                        mode === tab
                          ? "border-steel-border bg-slab-elevated text-cream-text"
                          : "border-iron-border text-zinc-mute hover:text-cream-text"
                      }`}
                    >
                      {tab === "login" ? "Sign in" : "Register"}
                    </button>
                  ))}
                </div>

                {mode === "register" ? (
                  <input className={vapiInputCls} placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
                ) : null}

                <input className={vapiInputCls} placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

                {mode === "register" ? (
                  <input className={vapiInputCls} placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
                ) : null}

                <input
                  className={vapiInputCls}
                  placeholder="Password (min 8 characters)"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                {error ? <p className="text-sm text-red-400">{error}</p> : null}

                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={loading}
                  className={`w-full justify-center ${mode === "login" ? "vapi-btn-ember" : "vapi-btn-mint"}`}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" strokeWidth={1.5} />}
                  {mode === "login" ? "Sign in" : "Create account"}
                </button>

                {allowSkip && onSkip ? (
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onSkip();
                    }}
                    className="w-full py-2 text-sm text-zinc-mute transition-colors hover:text-cream-text"
                  >
                    {skipLabel}
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export async function loadGuestProfile(): Promise<GuestProfile | null> {
  try {
    return await fetchGuestMe();
  } catch {
    return null;
  }
}
