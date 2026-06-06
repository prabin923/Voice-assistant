"use client";

import { useState } from "react";
import { Loader2, LogIn, LogOut, User, X } from "lucide-react";
import {
  fetchGuestMe,
  guestLogin,
  guestLogout,
  guestRegister,
  type GuestProfile,
} from "@/lib/clientGuestAuth";

interface Props {
  isDark: boolean;
  guest: GuestProfile | null;
  onGuestChange: (guest: GuestProfile | null) => void;
  preferredLanguage?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Hide the header trigger button (modal-only mode). */
  hideTrigger?: boolean;
  /** Called after successful sign-in or registration. */
  onAuthenticated?: (guest: GuestProfile) => void;
  /** Show a skip/continue-without-account action. */
  allowSkip?: boolean;
  skipLabel?: string;
  onSkip?: () => void;
  title?: string;
  description?: string;
}

export function GuestAuthPanel({
  isDark,
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

  const cardCls = isDark
    ? "bg-neutral-950 border border-neutral-800 text-neutral-100"
    : "bg-white border border-neutral-200 text-neutral-900";
  const inputCls = isDark
    ? "bg-neutral-900 border border-neutral-700 text-neutral-100 placeholder-neutral-500"
    : "bg-neutral-50 border border-neutral-300 text-neutral-900 placeholder-neutral-400";

  const tierBadge =
    guest?.loyaltyTier === "loyal"
      ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
      : guest?.loyaltyTier === "returning"
        ? "bg-sky-500/15 text-sky-300 border-sky-500/30"
        : "bg-neutral-500/10 text-neutral-400 border-neutral-600/30";

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
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!hideTrigger ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-[12px] font-semibold transition-all active:scale-95 ${
          isDark
            ? "glass text-neutral-300 hover:text-white"
            : "bg-white border border-neutral-200 text-neutral-700 hover:text-neutral-900"
        }`}
      >
        <User className="h-4 w-4" />
        {guest ? guest.name.split(" ")[0] : "Sign in"}
      </button>
      ) : null}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-3xl p-6 shadow-2xl ${cardCls}`}>
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <h2 className="text-lg font-bold">
                  {guest
                    ? "Guest profile"
                    : title ?? (mode === "login" ? "Guest sign in" : "Create guest account")}
                </h2>
                <p className={`text-sm mt-1 ${isDark ? "text-neutral-400" : "text-neutral-600"}`}>
                  {guest
                    ? "Your visits and bookings are saved for a smoother stay."
                    : description ?? "Sign in for higher limits and loyalty tracking."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={`p-2 rounded-xl ${isDark ? "hover:bg-white/10" : "hover:bg-neutral-100"}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {guest ? (
              <div className="space-y-4">
                <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${tierBadge}`}>
                  {guest.loyaltyLabel}
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className={`rounded-2xl p-3 ${isDark ? "bg-neutral-900" : "bg-neutral-50"}`}>
                    <p className="text-lg font-bold">{guest.visitCount}</p>
                    <p className={`text-[10px] uppercase tracking-wider ${isDark ? "text-neutral-500" : "text-neutral-500"}`}>Visits</p>
                  </div>
                  <div className={`rounded-2xl p-3 ${isDark ? "bg-neutral-900" : "bg-neutral-50"}`}>
                    <p className="text-lg font-bold">{guest.messageCount}</p>
                    <p className={`text-[10px] uppercase tracking-wider ${isDark ? "text-neutral-500" : "text-neutral-500"}`}>Messages</p>
                  </div>
                  <div className={`rounded-2xl p-3 ${isDark ? "bg-neutral-900" : "bg-neutral-50"}`}>
                    <p className="text-lg font-bold">{guest.bookingCount}</p>
                    <p className={`text-[10px] uppercase tracking-wider ${isDark ? "text-neutral-500" : "text-neutral-500"}`}>Bookings</p>
                  </div>
                </div>
                <div className={`rounded-2xl p-4 text-sm space-y-1 ${isDark ? "bg-neutral-900" : "bg-neutral-50"}`}>
                  <p><span className="opacity-60">Email:</span> {guest.email}</p>
                  {guest.phone ? <p><span className="opacity-60">Phone:</span> {guest.phone}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => void logout()}
                  disabled={loading}
                  className={`w-full flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${
                    isDark ? "bg-white/10 hover:bg-white/15" : "bg-neutral-100 hover:bg-neutral-200"
                  }`}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
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
                      className={`flex-1 rounded-xl py-2 text-sm font-semibold ${
                        mode === tab
                          ? isDark
                            ? "bg-white/10 text-white"
                            : "bg-neutral-900 text-white"
                          : isDark
                            ? "text-neutral-400"
                            : "text-neutral-600"
                      }`}
                    >
                      {tab === "login" ? "Sign in" : "Register"}
                    </button>
                  ))}
                </div>

                {mode === "register" ? (
                  <input
                    className={`w-full rounded-xl px-4 py-3 text-sm outline-none ${inputCls}`}
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                ) : null}

                <input
                  className={`w-full rounded-xl px-4 py-3 text-sm outline-none ${inputCls}`}
                  placeholder="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                {mode === "register" ? (
                  <input
                    className={`w-full rounded-xl px-4 py-3 text-sm outline-none ${inputCls}`}
                    placeholder="Phone (optional)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                ) : null}

                <input
                  className={`w-full rounded-xl px-4 py-3 text-sm outline-none ${inputCls}`}
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
                  className="w-full flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white"
                  style={{ background: "rgb(var(--hotel-accent-rgb))" }}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                  {mode === "login" ? "Sign in" : "Create account"}
                </button>

                {allowSkip && onSkip ? (
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onSkip();
                    }}
                    className={`w-full rounded-2xl px-4 py-3 text-sm font-medium ${
                      isDark ? "text-neutral-400 hover:text-neutral-200" : "text-neutral-600 hover:text-neutral-900"
                    }`}
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
