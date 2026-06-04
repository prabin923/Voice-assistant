"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Hotel, Loader2, Mic, Moon, Sun, UserRound } from "lucide-react";
import { StaynepLogo } from "@/components/StaynepLogo";
import { SiteShellBackdrop, siteHeaderChrome } from "@/components/SiteShellBackdrop";

export default function DemoPage() {
  const router = useRouter();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [loadingHotel, setLoadingHotel] = useState(false);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextTheme = savedTheme === "light" || savedTheme === "dark"
      ? savedTheme
      : (systemPrefersDark ? "dark" : "light");
    setTheme(nextTheme);
    void fetch("/api/auth/csrf", { credentials: "include" });
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  const isDark = theme === "dark";
  const muted = isDark ? "text-white/62" : "text-slate-600";
  const panel = isDark ? "border-white/10 bg-white/[0.045]" : "border-slate-200 bg-white/82";

  function chooseGuest() {
    router.push("/assistant");
  }

  async function chooseHotel() {
    setLoadingHotel(true);

    try {
      const meRes = await fetch("/api/auth/me", { credentials: "include" });
      if (meRes.ok) {
        const me = await meRes.json();
        if (me?.email) {
          router.push("/settings");
          return;
        }
      }
    } catch {
      // Continue to login
    }

    router.push("/admin/login?redirect=%2Fsettings");
  }

  return (
    <main className={`relative min-h-screen overflow-x-hidden ${isDark ? "bg-[#05070d] text-white" : "bg-[#f5f7fb] text-slate-950"}`}>
      <SiteShellBackdrop isDark={isDark} />

      <header className={`sticky top-0 z-20 border-b backdrop-blur-xl ${siteHeaderChrome(isDark)}`}>
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2 text-sm font-semibold opacity-80 hover:opacity-100">
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
          <StaynepLogo isDark={isDark} size="sm" />
          <button
            type="button"
            aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
            onClick={() => setTheme((value) => (value === "dark" ? "light" : "dark"))}
            className={`grid h-10 w-10 place-items-center rounded-full border transition ${isDark ? "border-white/10 bg-white/[0.05] text-white" : "border-slate-200 bg-white text-slate-700"}`}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-3xl items-center px-4 py-12 sm:px-6">
        <div className={`w-full rounded-[1.5rem] border p-6 sm:p-8 ${panel}`}>
          <p className={`text-xs font-black uppercase tracking-[0.24em] ${isDark ? "text-[#f8d36a]" : "text-[#9f7b1d]"}`}>
            Request a demo
          </p>
          <h1 className="va-display mt-4 text-balance text-[clamp(1.8rem,4vw,2.6rem)] leading-[0.95]">
            Who is trying the demo?
          </h1>
          <p className={`mt-3 text-sm leading-7 ${muted}`}>
            Guests try the voice assistant. Hotels sign in to manage their receptionist settings.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={chooseGuest}
              disabled={loadingHotel}
              className={`group rounded-[1.2rem] border p-5 text-left transition hover:-translate-y-0.5 ${
                isDark ? "border-white/10 bg-black/20 hover:border-cyan-300/30" : "border-slate-200 bg-white hover:border-[#163a5f]/25"
              }`}
            >
              <div className={`mb-4 grid h-12 w-12 place-items-center rounded-2xl ${isDark ? "bg-cyan-300/10 text-cyan-100" : "bg-slate-100 text-[#163a5f]"}`}>
                <UserRound className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold">Guest / user</h2>
              <p className={`mt-2 text-sm leading-6 ${muted}`}>Try the multilingual voice receptionist.</p>
              <span className={`mt-5 inline-flex items-center gap-2 text-sm font-bold ${isDark ? "text-[#8ee8ff]" : "text-[#163a5f]"}`}>
                Open assistant
                <Mic className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </button>

            <button
              type="button"
              onClick={chooseHotel}
              disabled={loadingHotel}
              className={`group rounded-[1.2rem] border p-5 text-left transition hover:-translate-y-0.5 ${
                isDark ? "border-white/10 bg-black/20 hover:border-[#f8d36a]/30" : "border-slate-200 bg-white hover:border-[#163a5f]/25"
              }`}
            >
              <div className={`mb-4 grid h-12 w-12 place-items-center rounded-2xl ${isDark ? "bg-[#f8d36a]/10 text-[#f8d36a]" : "bg-slate-100 text-[#163a5f]"}`}>
                {loadingHotel ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Hotel className="h-6 w-6" />
                )}
              </div>
              <h2 className="text-lg font-bold">Hotel</h2>
              <p className={`mt-2 text-sm leading-6 ${muted}`}>Sign in to configure branding, policies, and concierge settings.</p>
              <span className={`mt-5 inline-flex items-center gap-2 text-sm font-bold ${isDark ? "text-[#f8d36a]" : "text-[#163a5f]"}`}>
                Sign in
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
