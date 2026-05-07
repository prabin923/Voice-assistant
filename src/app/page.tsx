"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  Mic, Globe2, Shield, Zap, Sparkles, PhoneCall,
  Sun, Moon, ArrowRight, Check, Headphones,
} from "lucide-react";
import { StaynepLogo } from "@/components/StaynepLogo";
import { SiteShellBackdrop, siteHeaderChrome } from "@/components/SiteShellBackdrop";
import { Reveal } from "@/components/Reveal";

const FEATURES = [
  {
    title: "Natural voice conversations",
    body: "Guests speak freely; Willow understands context, intent, and tone—then responds like a seasoned concierge.",
    icon: Mic,
  },
  {
    title: "30+ languages, one assistant",
    body: "Switch languages on the fly. Perfect for international travelers without adding headcount.",
    icon: Globe2,
  },
  {
    title: "Telephony-ready",
    body: "Concierge call mode prepares you for lobby kiosks, room phones, and future PBX integrations.",
    icon: PhoneCall,
  },
  {
    title: "Answers from your playbook",
    body: "Load rooms, dining, policies, and FAQs once—responses stay aligned with how you run your property.",
    icon: Sparkles,
  },
  {
    title: "Escalation when it matters",
    body: "Sensitive requests route to staff with full context so nothing falls through the cracks.",
    icon: Headphones,
  },
  {
    title: "Configurable & secure",
    body: "Brand colors, messaging, and persona live in settings. Sessions and admin routes respect your boundaries.",
    icon: Shield,
  },
];

const STEPS = [
  { step: "01", title: "Deploy the assistant", body: "Open the voice app—no install required on modern browsers." },
  { step: "02", title: " Guests tap and speak", body: "One tap turns the microphone on; Willow listens and replies with premium TTS voices." },
  { step: "03", title: " You refine in dashboard", body: "Update hotel config, review analytics, and handle support escalations from the admin panel." },
];

const LANGS = ["English", "Spanish", "French", "Arabic", "Japanese", "Hindi", "German", "Portuguese", "+26 more"];

export default function MarketingHomePage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = window.localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const next = saved === "light" || saved === "dark" ? saved : prefersDark ? "dark" : "light";
    setTheme(next);
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  const isDark = theme === "dark";
  const muted = isDark ? "text-neutral-300" : "text-neutral-600";
  const border = isDark ? "border-white/10" : "border-neutral-200";
  const glassHoverGlow =
    "transition-all duration-500 hover:-translate-y-1.5 hover:border-[#e8c96a]/55 hover:shadow-[0_30px_72px_-26px_rgba(22,58,95,0.42),0_0_52px_-24px_rgba(110,164,199,0.16)] hover:brightness-[1.04]";
  const glassCard = `glass-panel rounded-2xl border ${glassHoverGlow}`;
  const statStripe = isDark ? "border-white/10 bg-white/[0.04] backdrop-blur-2xl" : "border-neutral-200/90 bg-white/60 backdrop-blur-2xl";

  return (
    <div className={`ac-grid-bg relative min-h-screen overflow-hidden ${isDark ? "text-neutral-100" : "text-neutral-900"}`}>
      <SiteShellBackdrop isDark={isDark} />

      <div className="relative z-10">
      {/* Nav */}
      <header className={`sticky top-0 z-50 border-b backdrop-blur-xl ${siteHeaderChrome(isDark)}`}>
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
          <div className={`ac-border-beam relative flex items-center justify-between gap-3 rounded-2xl border px-3 py-2 sm:px-4 ${
            isDark
              ? "border-white/10 bg-black/35 shadow-[0_12px_34px_-22px_rgba(0,0,0,0.8)]"
              : "border-neutral-200 bg-white/85 shadow-[0_12px_34px_-22px_rgba(15,23,42,0.22)]"
          }`}>
            <Link href="/" className="-ml-0.5 flex shrink-0 items-center">
              <StaynepLogo isDark={isDark} size="md" priority />
            </Link>
            <nav className={`hidden md:flex items-center gap-2 rounded-xl border px-2 py-1 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-neutral-200 bg-white/80"}`}>
              <a href="#features" className={`nav-link-glide rounded-lg px-3 py-1.5 text-sm font-medium transition ${isDark ? "text-neutral-300 hover:text-[#e8c96a]" : "text-neutral-600 hover:text-[#163a5f]"}`}>Features</a>
              <a href="#how" className={`nav-link-glide rounded-lg px-3 py-1.5 text-sm font-medium transition ${isDark ? "text-neutral-300 hover:text-[#e8c96a]" : "text-neutral-600 hover:text-[#163a5f]"}`}>How it works</a>
              <a href="#languages" className={`nav-link-glide rounded-lg px-3 py-1.5 text-sm font-medium transition ${isDark ? "text-neutral-300 hover:text-[#e8c96a]" : "text-neutral-600 hover:text-[#163a5f]"}`}>Languages</a>
            </nav>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
                onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                className={`flex h-9 w-9 items-center justify-center rounded-xl border transition hover:scale-105 active:scale-95 ${isDark ? "glass-chip border-white/12 text-neutral-300 hover:text-white" : "glass-chip border-neutral-200/80 text-neutral-600"}`}
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <Link
                href="/admin/login"
                className={`hidden sm:inline-flex rounded-xl border px-3 py-2 text-sm font-semibold transition hover:scale-[1.02] active:scale-95 ${isDark ? "glass-chip border-white/10 text-neutral-200 hover:text-white" : "glass-chip border-neutral-200/80 text-neutral-700 hover:text-neutral-950"}`}
              >
                Hotel admin
              </Link>
              <Link
                href="/assistant"
                className="marketing-nav-cta-pop relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-[#163a5f] via-[#1e5278] to-[#143d66] px-4 py-2 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] transition hover:brightness-110 hover:saturate-110"
              >
                Try now
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 sm:pt-24 lg:pb-32">
        <div className="ac-spotlight pointer-events-none absolute inset-0 -z-10" aria-hidden />
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] overflow-hidden" aria-hidden>
          <div className="marketing-blob-1 absolute left-[-10%] top-4 h-[420px] w-[520px] rounded-full bg-[#1e5278]/58 blur-[102px]" />
          <div className="marketing-blob-2 absolute right-[-12%] top-24 h-[360px] w-[420px] rounded-full bg-[#d1a93a]/30 blur-[102px]" />
          <div className="marketing-blob-3 absolute left-[34%] top-16 h-[320px] w-[320px] rounded-full bg-[#6ea4c7]/16 blur-[96px]" />
        </div>
        <div className="grid items-center gap-10 sm:gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-14">
          <div className="relative z-[1]">
            <p className={`hero-intro hero-intro-delay-1 marketing-badge-pulse mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wider backdrop-blur-xl ${
              isDark
                ? "border-[#fde047]/40 bg-[#dab52d]/12 text-[#fde047]"
                : "border-[#285a82]/30 bg-white/80 text-[#163a5f]"
            }`}>
              <Zap className="h-3 w-3" /> StayNEP · Aceternity Hero
            </p>
            <h1 className={`hero-intro hero-intro-delay-2 text-balance text-[2rem] font-black tracking-tight sm:text-6xl lg:text-7xl ${isDark ? "text-white" : "text-neutral-900"}`}>
              Build a concierge
              <span className="marketing-headline-shift block pt-2"> experience guests remember.</span>
            </h1>
            <p className={`hero-intro hero-intro-delay-3 mt-5 max-w-xl text-base leading-relaxed sm:text-lg ${muted}`}>
              Human-like voice replies, instant language switching, and clean escalation paths — wrapped in one premium hospitality assistant.
            </p>
            <div className="hero-intro hero-intro-delay-4 mt-7 flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center sm:gap-3">
              <Link
                href="/assistant"
                className="marketing-cta-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[#163a5f] via-[#1e5278] to-[#174a73] px-6 py-3.5 text-[15px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.24)] transition hover:brightness-[1.1] active:scale-[0.99] sm:min-h-0 sm:px-8 sm:py-4 sm:text-base"
              >
                Launch live demo
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/admin/register"
                className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-6 py-3.5 text-[15px] font-semibold backdrop-blur-xl transition sm:min-h-0 sm:px-8 sm:py-4 sm:text-base ${isDark ? "glass-chip border-white/20 hover:border-[#fde047]/40 hover:text-[#fde047]" : "glass-chip border-neutral-200/90 hover:border-[#163a5f]/30 hover:text-[#163a5f]"}`}
              >
                Register hotel
              </Link>
            </div>
            <div className="hero-intro hero-intro-delay-5 mt-6 flex flex-wrap items-center gap-2.5 text-xs sm:mt-8 sm:gap-3 sm:text-sm">
              {["No app install", "Web + call channel", "Actionable analytics"].map((item) => (
                <span key={item} className={`rounded-xl border px-3 py-1.5 ${isDark ? "border-white/12 bg-white/7 text-neutral-200" : "border-neutral-200 bg-white/75 text-neutral-700"}`}>
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="hero-intro hero-intro-delay-4 relative z-[1] mx-auto w-full max-w-2xl lg:max-w-none">
            <div className="pointer-events-none absolute -inset-4 -z-10 isolate overflow-hidden rounded-[1.875rem] sm:-inset-6 sm:rounded-[2.25rem]" aria-hidden>
              <div className="absolute -left-[8%] top-[18%] h-[72%] w-[52%] rounded-full bg-[#163a5f]/55 blur-[72px]" />
              <div className="absolute -right-[10%] top-[15%] h-[74%] w-[50%] rounded-full bg-[#d1a93a]/18 blur-[80px]" />
              <div className="absolute left-1/2 top-[30%] h-[58%] w-[46%] -translate-x-1/2 rounded-full bg-[#e8c96a]/10 blur-[64px]" />
              <div className="marketing-orbit-ring absolute inset-[-4%] scale-105 rounded-[inherit] opacity-[0.2] blur-xl" />
            </div>
            <div
              className={`ac-border-beam glass-panel relative overflow-hidden rounded-3xl border p-1.5 shadow-[0_24px_64px_-20px_rgba(22,58,95,0.35),0_0_48px_-12px_rgba(253,224,71,0.08)] ${
                isDark ? "border-white/[0.12]" : "border-neutral-200/70"
              }`}
            >
              <div
                className={`rounded-[22px] p-5 sm:p-6 ${
                  isDark
                    ? "border border-white/[0.06] bg-[radial-gradient(ellipse_110%_80%_at_50%_-20%,rgba(30,80,118,0.75)_0%,rgba(12,26,42,0.92)_42%,rgba(6,11,18,0.97)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-sm"
                    : "border border-neutral-200/80 bg-gradient-to-b from-white via-white to-neutral-50 shadow-[inset_0_1px_0_rgba(255,255,255,1)] backdrop-blur-sm"
                }`}
              >
                <div className="grid gap-5 sm:gap-6 md:grid-cols-[1.05fr_0.95fr]">
                  <div className={`ac-bento-card rounded-2xl border p-6 text-center sm:p-7 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-neutral-200 bg-white/90"}`}>
                    <div className="relative mx-auto w-fit animate-float">
                      <div className="marketing-ring-pulse-ring absolute inset-[-16px] opacity-45 sm:inset-[-20px]" />
                      <div
                        className="marketing-ring-pulse-ring absolute inset-[-16px] opacity-45 sm:inset-[-20px]"
                        style={{ animationDelay: "1.15s" } as CSSProperties}
                      />
                      <div
                        className={`relative flex h-32 w-32 items-center justify-center rounded-full border-2 shadow-[0_22px_50px_-12px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.14)] ring-2 sm:h-44 sm:w-44 ${
                          isDark
                            ? "border-[#3d7cc4]/55 bg-[linear-gradient(160deg,#1e5278_0%,#163a5f_40%,#0c2036_100%)] ring-[#fde047]/35"
                            : "border-[#163a5f]/40 bg-gradient-to-br from-neutral-100 to-white ring-[#163a5f]/12"
                        }`}
                      >
                        <Mic
                          className={`h-12 w-12 sm:h-16 sm:w-16 ${
                            isDark
                              ? "text-[#fffef5] drop-shadow-[0_0_26px_rgba(253,224,71,0.95)]"
                              : "text-[#163a5f] drop-shadow-[0_2px_6px_rgba(22,58,95,0.12)]"
                          }`}
                        />
                      </div>
                    </div>
                    <p className={`mt-5 text-base font-medium leading-snug ${isDark ? "text-neutral-200" : "text-neutral-700"}`}>
                      Tap to speak — instant concierge flow.
                    </p>
                    <Link
                      href="/assistant"
                      className={`mt-3 inline-flex items-center gap-1 text-base font-semibold underline underline-offset-4 decoration-2 transition-colors ${
                        isDark
                          ? "text-sky-200 decoration-sky-300/55 hover:text-white hover:decoration-white/80"
                          : "text-[#163a5f] decoration-[#163a5f]/50 hover:text-[#0f2740] hover:decoration-current"
                      }`}
                    >
                      Open assistant →
                    </Link>
                  </div>
                  <div className="grid gap-5">
                    <div className={`ac-bento-card rounded-2xl border p-5 sm:p-6 ${isDark ? "border-[#e4c449]/20 bg-[#c9a227]/8" : "border-[#163a5f]/15 bg-[#163a5f]/[0.04]"}`}>
                      <p className={`text-xs font-bold uppercase tracking-[0.12em] ${isDark ? "text-[#fde047]" : "text-[#163a5f]"}`}>Live Metrics</p>
                      <div className="mt-4 grid grid-cols-1 gap-2.5 lg:grid-cols-2 lg:gap-3">
                        <div
                          className={`min-w-0 rounded-xl border px-2.5 py-3 sm:px-3 ${isDark ? "border-white/10 bg-white/5" : "border-neutral-200 bg-white"}`}
                        >
                          <p
                            className={`text-center text-[1.2rem] leading-none font-black tabular-nums sm:text-[1.45rem] ${isDark ? "text-white" : "text-neutral-900"}`}
                          >
                            34+
                          </p>
                          <p
                            className={`mt-1 text-center text-[8px] font-semibold uppercase leading-tight tracking-[0.03em] [overflow-wrap:anywhere] sm:text-[9px] sm:tracking-[0.04em] ${isDark ? "text-neutral-200" : "text-neutral-600"}`}
                          >
                            Languages
                          </p>
                        </div>
                        <div
                          className={`min-w-0 rounded-xl border px-2.5 py-3 sm:px-3 ${isDark ? "border-white/10 bg-white/5" : "border-neutral-200 bg-white"}`}
                        >
                          <p
                            className={`text-center text-[1.2rem] leading-none font-black tabular-nums sm:text-[1.45rem] ${isDark ? "text-white" : "text-neutral-900"}`}
                          >
                            24/7
                          </p>
                          <p
                            className={`mt-1 text-center text-[8px] font-semibold uppercase leading-tight tracking-[0.03em] [overflow-wrap:anywhere] sm:text-[9px] sm:tracking-[0.04em] ${isDark ? "text-neutral-200" : "text-neutral-600"}`}
                          >
                            Coverage
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className={`ac-bento-card rounded-2xl border p-5 sm:p-6 ${isDark ? "border-[#6ea4c7]/25 bg-[#6ea4c7]/[0.08]" : "border-[#6ea4c7]/45 bg-[#eaf3f9]/75"}`}>
                      <p className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-[#9ec1da]" : "text-[#305d7a]"}`}>Capabilities</p>
                      <div className="mt-4 flex flex-wrap gap-2.5">
                        {["Voice + Call", "Escalations", "Admin Controls"].map((cap) => (
                          <span
                            key={cap}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${isDark ? "border-white/15 bg-white/6 text-neutral-200" : "border-neutral-200 bg-white text-neutral-700"}`}
                          >
                            {cap}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <Reveal>
      <section className={`marketing-strip-glare relative overflow-hidden border-y ${statStripe}`}>
        <div className="marketing-strip-shimmer" aria-hidden />
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-5 px-4 py-8 sm:grid-cols-4 sm:gap-6 sm:px-6 sm:py-9">
          {[
            { label: "Languages", value: "34+" },
            { label: "Setup", value: "Minutes" },
            { label: "Mode", value: "Voice + call" },
            { label: "Built for", value: "Hotels" },
          ].map((s, i) => (
            <div key={s.label} className="text-center">
              <p
                className="marketing-stat-num text-2xl font-bold text-yellow-700 sm:text-3xl dark:text-[#e4c449]"
                style={{ animationDelay: `${i * 0.55}s` } as CSSProperties}
              >
                {s.value}
              </p>
              <p className={`mt-1 text-xs font-semibold uppercase tracking-wider ${muted}`}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>
      </Reveal>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className={`text-3xl font-black sm:text-5xl ${isDark ? "text-white" : "text-neutral-900"}`}>Everything guests expect</h2>
          <p className={`mt-4 text-base ${muted}`}>From first question to staff handoff—one premium voice surface, consistent quality.</p>
        </Reveal>
        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delayMs={i * 70}>
              <div className="h-full">
              <div className={`group relative h-full rounded-3xl border p-4 transition-all duration-300 hover:-translate-y-1 sm:p-5 ${
                isDark
                  ? "border-white/10 bg-[#0d1622]/70 hover:border-[#e8c96a]/30 hover:bg-[#111d2c]/80"
                  : "border-neutral-200 bg-[#f8fafc] hover:border-[#6ea4c7]/55 hover:bg-white"
              } ${
                i === 1
                  ? (isDark
                      ? "shadow-[0_0_0_1px_rgba(110,164,199,0.35),0_12px_30px_-18px_rgba(110,164,199,0.45)] hover:shadow-[0_0_0_1px_rgba(110,164,199,0.45),0_20px_44px_-20px_rgba(110,164,199,0.5)]"
                      : "shadow-[0_0_0_1px_rgba(110,164,199,0.35),0_14px_30px_-20px_rgba(110,164,199,0.45)] hover:shadow-[0_0_0_1px_rgba(110,164,199,0.45),0_20px_44px_-22px_rgba(110,164,199,0.5)]")
                  : (isDark
                      ? "shadow-[0_10px_24px_-18px_rgba(0,0,0,0.6)] hover:shadow-[0_20px_44px_-22px_rgba(10,20,35,0.8)]"
                      : "shadow-[0_10px_24px_-18px_rgba(15,23,42,0.22)] hover:shadow-[0_18px_40px_-22px_rgba(15,23,42,0.32)]")
              }`}>
              <div
                className={`pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 translate-x-0 transition-transform duration-700 ease-out group-hover:translate-x-[320%] ${
                  isDark
                    ? "bg-gradient-to-r from-transparent via-white/12 to-transparent"
                    : "bg-gradient-to-r from-transparent via-white/80 to-transparent"
                }`}
                aria-hidden
              />
              <div className={`mb-5 flex h-28 items-center justify-center rounded-2xl border transition-colors duration-300 ${
                isDark
                  ? "border-white/8 bg-white/[0.03] group-hover:border-[#e8c96a]/30"
                  : "border-neutral-200 bg-[#eef2f7] group-hover:border-[#6ea4c7]/45"
              }`}>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:scale-105 ${
                  isDark
                    ? "border-white/12 bg-white/[0.04]"
                    : "border-neutral-200 bg-white"
                }`}>
                  <f.icon className={`h-5 w-5 ${
                    i === 1
                      ? "text-[#6ea4c7]"
                      : (isDark ? "text-neutral-200 group-hover:text-[#e8c96a]" : "text-[#163a5f] group-hover:text-[#1e5278]")
                  }`} />
                </div>
              </div>
              <h3 className={`mx-auto max-w-[18ch] text-center text-[1.15rem] font-semibold tracking-[-0.01em] sm:text-[1.25rem] ${isDark ? "text-white" : "text-neutral-900"}`}>{f.title}</h3>
              <p className={`mx-auto mt-3 max-w-[36ch] text-center text-[0.95rem] leading-7 ${isDark ? "text-neutral-300" : "text-neutral-600"}`}>{f.body}</p>
              </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="section-how-animated relative scroll-mt-24 overflow-hidden py-24 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className={`text-3xl font-black sm:text-5xl ${isDark ? "text-white" : "text-neutral-900"}`}>How it works</h2>
            <p className={`mt-4 ${muted}`}>Three beats from hello to measurable guest satisfaction.</p>
          </Reveal>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.step} delayMs={i * 80}>
                <div className="marketing-card-pulse h-full"
                  style={
                    {
                      "--card-y": `${6.4 + (i % 3) * 0.6}s`,
                      "--card-delay": `${-i * 0.7}s`,
                    } as CSSProperties
                  }
                >
                <div className={`group relative h-full rounded-3xl border p-4 transition-all duration-300 hover:-translate-y-1 sm:p-5 ${
                  isDark
                    ? "border-white/10 bg-[#0d1622]/70 hover:border-[#e8c96a]/30 hover:bg-[#111d2c]/80"
                    : "border-neutral-200 bg-[#f8fafc] hover:border-[#6ea4c7]/55 hover:bg-white"
                } ${
                  i === 1
                    ? (isDark
                        ? "shadow-[0_0_0_1px_rgba(110,164,199,0.35),0_12px_30px_-18px_rgba(110,164,199,0.45)] hover:shadow-[0_0_0_1px_rgba(110,164,199,0.45),0_20px_44px_-20px_rgba(110,164,199,0.5)]"
                        : "shadow-[0_0_0_1px_rgba(110,164,199,0.35),0_14px_30px_-20px_rgba(110,164,199,0.45)] hover:shadow-[0_0_0_1px_rgba(110,164,199,0.45),0_20px_44px_-22px_rgba(110,164,199,0.5)]")
                    : (isDark
                        ? "shadow-[0_10px_24px_-18px_rgba(0,0,0,0.6)] hover:shadow-[0_20px_44px_-22px_rgba(10,20,35,0.8)]"
                        : "shadow-[0_10px_24px_-18px_rgba(15,23,42,0.22)] hover:shadow-[0_18px_40px_-22px_rgba(15,23,42,0.32)]")
                }`}>
                <div
                  className={`pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 translate-x-0 transition-transform duration-700 ease-out group-hover:translate-x-[320%] ${
                    isDark
                      ? "bg-gradient-to-r from-transparent via-white/12 to-transparent"
                      : "bg-gradient-to-r from-transparent via-white/80 to-transparent"
                  }`}
                  aria-hidden
                />
                <div className={`mb-5 flex h-28 items-center justify-center rounded-2xl border transition-colors duration-300 ${
                  isDark
                    ? "border-white/8 bg-white/[0.03] group-hover:border-[#e8c96a]/30"
                    : "border-neutral-200 bg-[#eef2f7] group-hover:border-[#6ea4c7]/45"
                }`}>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl border ${
                    isDark
                      ? "border-white/12 bg-white/[0.04]"
                      : "border-neutral-200 bg-white"
                  }`}>
                    <span className={`text-xs font-black tracking-wide ${
                      isDark ? "text-[#e8c96a]" : "text-[#163a5f]"
                    }`}>{s.step}</span>
                  </div>
                </div>
                <h3 className={`mx-auto max-w-[18ch] text-center text-[1.15rem] font-semibold tracking-[-0.01em] sm:text-[1.25rem] ${isDark ? "text-white" : "text-neutral-900"}`}>{s.title}</h3>
                <p className={`mx-auto mt-3 max-w-[36ch] text-center text-[0.95rem] leading-7 ${isDark ? "text-neutral-300" : "text-neutral-600"}`}>{s.body}</p>
                </div>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              href="/assistant"
              className="marketing-cta-primary inline-flex items-center gap-2 rounded-xl bg-[#163a5f] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1e5278]"
            >
              Launch assistant
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Languages */}
      <section id="languages" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24 sm:px-6">
        <Reveal>
        <div className={`ac-bento-card glass-panel rounded-3xl border p-8 sm:p-10 lg:p-12 ${glassHoverGlow} shadow-[0_24px_80px_-24px_rgba(15,23,42,0.35)]`}>
          <div className="grid items-stretch gap-6 lg:grid-cols-[1fr_1.1fr] lg:gap-8">
            <div>
              <Globe2 className="marketing-icon-wobble h-10 w-10 text-[#163a5f] dark:text-[#e4c449]" />
              <h2 className={`mt-6 text-3xl font-black sm:text-5xl ${isDark ? "text-white" : "text-neutral-900"}`}>Speak globally, sound local</h2>
              <p className={`mt-4 ${muted}`}>
                Willow covers major travel languages with curated voice selection—so greetings and answers feel natural, not robotic.
              </p>
              <ul className="mt-8 space-y-3">
                {["Browser speech where available", "Server-side transcription fallback", "Tuned for clarity and pacing"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm font-medium">
                    <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span className={isDark ? "text-neutral-300" : "text-neutral-700"}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid gap-4">
              <div className={`ac-bento-card rounded-2xl border p-4 sm:p-5 ${isDark ? "border-white/10 bg-white/[0.04]" : "border-neutral-200 bg-white/80"}`}>
                <p className={`mb-3 text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-[#e8c96a]" : "text-[#163a5f]"}`}>Supported Languages</p>
                <div className="flex flex-wrap gap-2">
                  {LANGS.map((lang) => (
                    <span
                      key={lang}
                      className={`marketing-pill-bob rounded-xl border px-3 py-2 text-xs font-semibold backdrop-blur-md transition hover:scale-105 hover:border-[#c9a227]/55 ${
                        isDark
                          ? "glass-chip border-white/12 bg-white/[0.06] text-neutral-200"
                          : "border-neutral-200/80 bg-white/90 text-neutral-700"
                      }`}
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className={`ac-bento-card rounded-2xl border p-5 ${isDark ? "border-[#6ea4c7]/25 bg-[#6ea4c7]/[0.08]" : "border-[#6ea4c7]/45 bg-[#eaf3f9]/75"}`}>
                  <p className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-[#9ec1da]" : "text-[#305d7a]"}`}>Coverage</p>
                  <p className={`mt-2 text-3xl font-black ${isDark ? "text-white" : "text-neutral-900"}`}>34+</p>
                  <p className={`mt-1 text-xs ${isDark ? "text-neutral-300" : "text-neutral-600"}`}>Guest-facing languages</p>
                </div>
                <div className={`ac-bento-card rounded-2xl border p-5 ${isDark ? "border-[#e8c96a]/24 bg-[#d1a93a]/[0.09]" : "border-[#163a5f]/18 bg-[#163a5f]/[0.05]"}`}>
                  <p className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-[#e8c96a]" : "text-[#163a5f]"}`}>Availability</p>
                  <p className={`mt-2 text-3xl font-black ${isDark ? "text-white" : "text-neutral-900"}`}>24/7</p>
                  <p className={`mt-1 text-xs ${isDark ? "text-neutral-300" : "text-neutral-600"}`}>Always-on guest support</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        </Reveal>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <Reveal delayMs={40}>
        <div className="ac-border-beam glass-panel relative overflow-hidden rounded-3xl border border-[#163a5f]/35 bg-[#163a5f]/10 p-[1px] shadow-[0_34px_90px_-30px_rgba(22,58,95,0.55)] backdrop-blur-xl">
        <div className="relative overflow-hidden rounded-[calc(1.5rem-1px)] bg-gradient-to-br from-[#0f2844] via-[#163a5f] to-[#9a7614] p-7 sm:p-10">
          <div className="marketing-hero-scan pointer-events-none absolute left-1/2 top-1/2 aspect-square h-[min(920px,150vw)] w-[min(920px,150vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[conic-gradient(from_185deg,rgba(250,204,21,0.82),transparent_28%,rgba(42,94,148,0.72)_48%,transparent_62%,rgba(232,212,73,0.92)_82%,transparent)] blur-[92px]" aria-hidden />
          <div className="animate-pulse-soft absolute -left-20 top-10 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_55%)]" />
          <div className="relative grid items-center gap-6 lg:grid-cols-[1fr_auto]">
            <div>
              <h2 className="text-3xl font-black text-white sm:text-5xl">Ready when your guests are</h2>
              <p className="mt-4 max-w-xl text-sm text-white/85 sm:text-base">
                Jump into the live voice experience—configure your property afterward from the admin dashboard.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/30 bg-white/10 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wider text-white/70">Setup</p>
                  <p className="mt-1 text-lg font-black text-white">Minutes</p>
                </div>
                <div className="rounded-xl border border-white/30 bg-white/10 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wider text-white/70">Languages</p>
                  <p className="mt-1 text-lg font-black text-white">34+</p>
                </div>
                <div className="rounded-xl border border-white/30 bg-white/10 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wider text-white/70">Support</p>
                  <p className="mt-1 text-lg font-black text-white">24/7</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-stretch gap-3 sm:flex-row lg:flex-col lg:min-w-[250px]">
              <Link
                href="/assistant"
                className="marketing-badge-pulse inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-[#163a5f] shadow-xl transition hover:scale-[1.02] hover:bg-neutral-100"
              >
                Try now — open assistant
                <Mic className="h-5 w-5" />
              </Link>
              <Link
                href="/admin/register"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/45 bg-white/10 px-8 py-4 text-base font-semibold text-white backdrop-blur-md transition hover:scale-[1.02] hover:bg-white/[0.18]"
              >
                Register hotel
              </Link>
            </div>
          </div>
        </div>
        </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className={`border-t py-14 backdrop-blur-xl ${border} ${isDark ? "bg-black/35" : "bg-neutral-50/85"}`}>
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div>
            <StaynepLogo isDark={isDark} size="lg" className="max-w-[220px]" />
            <p className={`mt-4 max-w-xs text-sm ${muted}`}>Voice-first concierge experiences for modern hospitality.</p>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:flex sm:gap-16">
            <div>
              <p className={`text-xs font-bold uppercase tracking-wider ${muted}`}>Product</p>
              <ul className="mt-4 space-y-2 text-sm">
                <li><Link href="/assistant" className="font-medium hover:text-yellow-700 dark:hover:text-[#e4c449]">Voice assistant</Link></li>
                <li><Link href="#features" className={`${muted} hover:text-yellow-700 dark:hover:text-[#e4c449]`}>Features</Link></li>
              </ul>
            </div>
            <div>
              <p className={`text-xs font-bold uppercase tracking-wider ${muted}`}>Hotels</p>
              <ul className="mt-4 space-y-2 text-sm">
                <li><Link href="/admin/register" className="font-medium hover:text-yellow-700 dark:hover:text-[#e4c449]">Register</Link></li>
                <li><Link href="/admin/login" className="font-medium hover:text-yellow-700 dark:hover:text-[#e4c449]">Admin login</Link></li>
                <li><Link href="/settings" className={`${muted} hover:text-yellow-700 dark:hover:text-[#e4c449]`}>Configuration</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <p className={`mx-auto mt-12 max-w-6xl px-4 text-center text-xs sm:px-6 ${muted}`}>
          © {new Date().getFullYear()} StayNEP · Built for concierge teams everywhere
        </p>
      </footer>
      </div>
    </div>
  );
}
