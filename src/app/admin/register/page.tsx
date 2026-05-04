"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, UserPlus, Hotel, Moon, Sun } from "lucide-react";

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
    <div className={`min-h-screen flex items-center justify-center px-4 ${isDark ? "bg-neutral-950" : "bg-neutral-100"}`}>
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-4">
          <button
            type="button"
            onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
              isDark
                ? "bg-white/[0.04] border-white/10 text-neutral-200 hover:bg-white/[0.08]"
                : "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50"
            }`}
            aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {isDark ? "Light Mode" : "Dark Mode"}
          </button>
        </div>
        <div className="flex flex-col items-center mb-8">
          <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center mb-4 ${isDark ? "bg-white/5 border-white/10" : "bg-white border-neutral-200"}`}>
            <Hotel className="w-8 h-8 text-rose-400" />
          </div>
          <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-neutral-900"}`}>Create Account</h1>
          <p className={`text-sm mt-1 ${isDark ? "text-neutral-500" : "text-neutral-600"}`}>Register your hotel to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className={`rounded-2xl border p-6 space-y-4 ${isDark ? "bg-white/[0.03] border-white/[0.08]" : "bg-white border-neutral-200"}`}
            style={{ backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>

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
                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/20 transition-all text-sm ${
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
                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/20 transition-all text-sm ${
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
                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/20 transition-all text-sm ${
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
                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/20 transition-all text-sm ${
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
              className="w-full py-3 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
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
          <Link href="/admin/login" className="text-rose-400 hover:text-rose-300 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
