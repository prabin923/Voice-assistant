"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, UserPlus, Moon, Sun } from "lucide-react";
import { StaynepLogo } from "@/components/StaynepLogo";
import { SiteShellBackdrop, siteHeaderChrome } from "@/components/SiteShellBackdrop";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      router.push("/settings");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

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
            <Link href="/assistant" className={`text-xs font-semibold uppercase tracking-wider hover:text-yellow-700 dark:hover:text-[#e4c449] ${isDark ? "text-neutral-400" : "text-neutral-600"}`}>
              Voice assistant
            </Link>
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-4">
          <button
            type="button"
            onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors bg-transparent ${
              isDark
                ? "border-white/15 text-neutral-200 hover:bg-white/[0.06]"
                : "border-neutral-300 text-neutral-700 hover:bg-neutral-900/5"
            }`}
            aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {isDark ? "Light Mode" : "Dark Mode"}
          </button>
        </div>
        <div className="flex flex-col items-center mb-8">
          <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-neutral-900"}`}>Create Account</h1>
          <p className={`text-sm mt-1 ${isDark ? "text-neutral-500" : "text-neutral-600"}`}>Register your hotel to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? "text-neutral-500" : "text-neutral-600"}`}>
                Hotel Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:border-[#c9a227]/65 focus:ring-1 focus:ring-[#c9a227]/22 transition-all text-sm ${
                  isDark
                    ? "bg-white/[0.04] border-white/[0.08] text-white placeholder-neutral-600"
                    : "bg-white border-neutral-300 text-neutral-900 placeholder-neutral-400"
                }`}
                placeholder="The Grand Hotel"
              />
            </div>

            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? "text-neutral-500" : "text-neutral-600"}`}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:border-[#c9a227]/65 focus:ring-1 focus:ring-[#c9a227]/22 transition-all text-sm ${
                  isDark
                    ? "bg-white/[0.04] border-white/[0.08] text-white placeholder-neutral-600"
                    : "bg-white border-neutral-300 text-neutral-900 placeholder-neutral-400"
                }`}
                placeholder="admin@grandhotel.com"
              />
            </div>

            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? "text-neutral-500" : "text-neutral-600"}`}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:border-[#c9a227]/65 focus:ring-1 focus:ring-[#c9a227]/22 transition-all text-sm ${
                  isDark
                    ? "bg-white/[0.04] border-white/[0.08] text-white placeholder-neutral-600"
                    : "bg-white border-neutral-300 text-neutral-900 placeholder-neutral-400"
                }`}
                placeholder="Min. 8 characters"
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
                required
                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:border-[#c9a227]/65 focus:ring-1 focus:ring-[#c9a227]/22 transition-all text-sm ${
                  isDark
                    ? "bg-white/[0.04] border-white/[0.08] text-white placeholder-neutral-600"
                    : "bg-white border-neutral-300 text-neutral-900 placeholder-neutral-400"
                }`}
                placeholder="Repeat your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#163a5f] hover:bg-[#1e5278] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </div>
        </form>

        <p className={`text-center text-sm mt-6 ${isDark ? "text-neutral-600" : "text-neutral-500"}`}>
          Already have an account?{" "}
          <Link href="/admin/login" className="text-[#163a5f] dark:text-[#e4c449] underline-offset-4 hover:underline transition-colors dark:hover:text-[#fce878]">
            Sign in
          </Link>
        </p>
      </div>
        </div>
      </div>
    </div>
  );
}
