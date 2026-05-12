"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, Lock, Moon, Sun } from "lucide-react";
import { StaynepLogo } from "@/components/StaynepLogo";
import { SiteShellBackdrop, siteHeaderChrome } from "@/components/SiteShellBackdrop";

function getCookie(name: string): string | null {
  const parts = document.cookie.split(";").map((entry) => entry.trim());
  const found = parts.find((entry) => entry.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}

function ResetPasswordForm({ isDark }: { isDark: boolean }) {
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const token = searchParams.get("token") || "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Invalid reset link");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const csrfToken = getCookie("csrf-token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (csrfToken) headers["x-csrf-token"] = csrfToken;

      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Reset failed");
        return;
      }
      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
    } catch {
      setError("Reset failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-neutral-900"}`}>Set New Password</h1>
          <p className={`text-sm mt-1 text-center ${isDark ? "text-neutral-500" : "text-neutral-600"}`}>
            Choose a strong password for your admin account.
          </p>
        </div>

        {success ? (
          <div className="space-y-5">
            <div className="px-4 py-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 mt-0.5" />
              <span>Password updated successfully. Please sign in with your new password.</span>
            </div>
            <Link
              href="/admin/login"
              className="w-full py-3 rounded-xl bg-[#163a5f] hover:bg-[#1e5278] text-white font-semibold text-sm flex items-center justify-center transition-colors"
            >
              Go to Sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div role="alert" className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? "text-neutral-500" : "text-neutral-600"}`}>
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                required
                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:border-[#c9a227]/65 focus:ring-1 focus:ring-[#c9a227]/22 transition-all text-sm ${
                  isDark ? "bg-white/[0.04] border-white/[0.08] text-white placeholder-neutral-600" : "bg-white border-neutral-300 text-neutral-900 placeholder-neutral-400"
                }`}
                placeholder="At least 8 characters"
              />
            </div>
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? "text-neutral-500" : "text-neutral-600"}`}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                required
                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:border-[#c9a227]/65 focus:ring-1 focus:ring-[#c9a227]/22 transition-all text-sm ${
                  isDark ? "bg-white/[0.04] border-white/[0.08] text-white placeholder-neutral-600" : "bg-white border-neutral-300 text-neutral-900 placeholder-neutral-400"
                }`}
                placeholder="Repeat new password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#163a5f] hover:bg-[#1e5278] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    void fetch("/api/auth/csrf", { credentials: "include" });
    const savedTheme = window.localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextTheme = savedTheme === "light" || savedTheme === "dark"
      ? savedTheme
      : (systemPrefersDark ? "dark" : "light");
    setTheme(nextTheme);
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  const isDark = theme === "dark";

  return (
    <div className="relative min-h-screen overflow-hidden">
      <SiteShellBackdrop isDark={isDark} />
      <div className="relative z-10 flex min-h-screen flex-col">
        <header className={`sticky top-0 z-20 border-b backdrop-blur-xl ${siteHeaderChrome(isDark)}`}>
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="-ml-0.5 flex shrink-0 items-center" aria-label="StayNEP home">
              <StaynepLogo isDark={isDark} size="md" priority />
            </Link>
            <button
              type="button"
              onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors bg-transparent ${
                isDark ? "border-white/15 text-neutral-200 hover:bg-white/[0.06]" : "border-neutral-300 text-neutral-700 hover:bg-neutral-900/5"
              }`}
              aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        <Suspense
          fallback={
            <div className="flex flex-1 items-center justify-center px-4 py-20">
              <Loader2 className="h-8 w-8 animate-spin text-[#163a5f] dark:text-[#e4c449]" />
            </div>
          }
        >
          <ResetPasswordForm isDark={isDark} />
        </Suspense>
      </div>
    </div>
  );
}
