"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  Mic, Globe2, Shield, Zap, Sparkles, PhoneCall, ChevronDown,
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
  const muted = isDark ? "text-neutral-400" : "text-neutral-600";
  const border = isDark ? "border-white/10" : "border-neutral-200";
  const glassHoverGlow =
    "transition-all duration-500 hover:border-[#fde047]/52 hover:shadow-[0_28px_70px_-18px_rgba(22,58,95,0.35),0_0_52px_-20px_rgba(56,189,248,0.12)] hover:brightness-[1.06] hover:saturate-[1.05]";
  const glassCard = `glass-panel rounded-2xl border ${glassHoverGlow}`;
  const statStripe = isDark ? "border-white/10 bg-white/[0.04] backdrop-blur-2xl" : "border-neutral-200/90 bg-white/60 backdrop-blur-2xl";

  return (
    <div className={`relative min-h-screen overflow-hidden ${isDark ? "text-neutral-100" : "text-neutral-900"}`}>
      <SiteShellBackdrop isDark={isDark} />

      <div className="relative z-10">
      {/* Nav */}
      <header className={`sticky top-0 z-50 border-b backdrop-blur-xl ${siteHeaderChrome(isDark)}`}>
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="-ml-0.5 flex shrink-0 items-center">
            <StaynepLogo isDark={isDark} size="md" priority />
          </Link>
          <nav className={`hidden md:flex items-center gap-8 text-sm font-medium ${muted}`}>
            <a href="#features" className="nav-link-glide text-inherit hover:text-yellow-600 dark:hover:text-[#e4c449]">Features</a>
            <a href="#how" className="nav-link-glide text-inherit hover:text-yellow-600 dark:hover:text-[#e4c449]">How it works</a>
            <a href="#languages" className="nav-link-glide text-inherit hover:text-yellow-600 dark:hover:text-[#e4c449]">Languages</a>
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
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 sm:pt-24 lg:pb-32">
        <div className="pointer-events-none absolute left-1/2 top-24 w-[min(115%,760px)] -translate-x-1/2 md:top-28" aria-hidden>
          <div className="marketing-blob-1 mx-auto h-[min(460px,65vw)] w-full rounded-[50%] bg-gradient-to-tr from-[#2f6faf]/75 via-[#163a5f]/52 to-[#38bdf8]/32 blur-[106px]" />
        </div>
        <div className="pointer-events-none absolute right-[-22%] top-[42%] w-[min(48vw,440px)] max-md:hidden" aria-hidden>
          <div className="marketing-blob-2 h-[min(380px,48vw)] w-full rounded-[50%] bg-gradient-to-bl from-[#eab308]/55 via-[#fde047]/35 to-amber-200/22 blur-[100px]" />
        </div>
        <div className="pointer-events-none absolute left-[-14%] top-[52%] w-[360px] max-md:hidden" aria-hidden>
          <div className="marketing-blob-3 h-[300px] w-full rounded-[50%] bg-gradient-to-br from-[#285a82]/62 to-sky-400/38 blur-[90px]" />
        </div>
        <div className="relative mx-auto max-w-3xl text-center">
          <p className={`hero-intro hero-intro-delay-1 marketing-badge-pulse mb-4 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wider backdrop-blur-xl ${
            isDark
              ? "border-[#fde047]/45 bg-[#dab52d]/16 text-[#fde047]"
              : "border-sky-300/65 bg-[#163a5f]/[0.09] text-[#0c4a6e]"
          }`}>
            <Zap className="marketing-icon-wobble h-3 w-3" /> Voice concierge for hotels
          </p>
          <h1 className={`hero-intro hero-intro-delay-2 text-4xl font-bold tracking-tight sm:text-6xl ${isDark ? "text-white" : "text-neutral-900"}`}>
            Answer every guest.
            <span className="marketing-headline-shift block pt-2"> In their language.</span>
          </h1>
          <p className={`hero-intro hero-intro-delay-3 mt-6 text-lg leading-relaxed sm:text-xl ${muted}`}>
            Willow is a universal voice assistant built for hospitality—listening, answering, and escalating with the polish your brand deserves.
          </p>
          <div className="hero-intro hero-intro-delay-4 mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/assistant"
              className="marketing-cta-primary inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[#163a5f] via-[#1e5278] to-[#174a73] px-8 py-4 text-base font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] transition hover:brightness-[1.08] hover:saturate-110 active:scale-[0.99] sm:w-auto"
            >
              Try the voice assistant
              <ArrowRight className="h-5 w-5" />
            </Link>
            <a
              href="#features"
              className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-8 py-4 text-base font-semibold backdrop-blur-xl transition hover:scale-[1.02] active:scale-[0.99] sm:w-auto ${isDark ? "glass-chip border-white/15 hover:border-white/25" : "glass-chip border-neutral-200/90"}`}
            >
              Explore features
              <ChevronDown className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Hero visual — blobs kept to sides + darker inner panel avoids muddy cyan/gold blur in center */}
        <div className="hero-intro hero-intro-delay-5 relative z-[1] mx-auto mt-16 max-w-4xl">
          <div className="pointer-events-none absolute -inset-4 -z-10 isolate overflow-hidden rounded-[1.875rem] sm:-inset-6 sm:rounded-[2.25rem]" aria-hidden>
            <div className="absolute -left-[8%] top-[18%] h-[72%] w-[52%] rounded-full bg-[#163a5f]/55 blur-[72px]" />
            <div className="absolute -right-[10%] top-[15%] h-[74%] w-[50%] rounded-full bg-[#ea580c]/22 blur-[80px]" />
            <div className="absolute left-1/2 top-[30%] h-[58%] w-[46%] -translate-x-1/2 rounded-full bg-[#fde047]/12 blur-[64px]" />
            <div className="marketing-orbit-ring absolute inset-[-4%] scale-105 rounded-[inherit] opacity-[0.28] blur-xl" />
            <div className="marketing-orbit-ring marketing-spin-slow-ccw absolute inset-[-18%] scale-125 rounded-[inherit] opacity-[0.14] blur-3xl" />
          </div>
          <div
            className={`glass-panel relative overflow-hidden rounded-3xl border p-1 shadow-[0_24px_64px_-20px_rgba(22,58,95,0.35),0_0_48px_-12px_rgba(253,224,71,0.08)] ${
              isDark ? "border-white/[0.12]" : "border-neutral-200/70"
            }`}
          >
            <div
              className={`marketing-hero-mic-inner rounded-[22px] p-8 sm:p-12 ${
                isDark
                  ? "border border-white/[0.06] bg-[radial-gradient(ellipse_110%_80%_at_50%_-20%,rgba(30,80,118,0.75)_0%,rgba(12,26,42,0.92)_42%,rgba(6,11,18,0.97)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-sm"
                  : "border border-neutral-200/80 bg-gradient-to-b from-white via-white to-neutral-50 shadow-[inset_0_1px_0_rgba(255,255,255,1)] backdrop-blur-sm"
              }`}
            >
              <div className="flex flex-col items-center gap-8">
                <div className="relative animate-float">
                  <div className="marketing-ring-pulse-ring absolute inset-[-12px] opacity-50 sm:inset-[-16px]" />
                  <div
                    className="marketing-ring-pulse-ring absolute inset-[-12px] opacity-50 sm:inset-[-16px]"
                    style={{ animationDelay: "1.15s" } as CSSProperties}
                  />
                  <div
                    className={`relative flex h-40 w-40 items-center justify-center rounded-full border-2 shadow-[0_22px_50px_-12px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.14)] ring-2 sm:h-48 sm:w-48 ${
                      isDark
                        ? "border-[#3d7cc4]/55 bg-[linear-gradient(160deg,#1e5278_0%,#163a5f_40%,#0c2036_100%)] ring-[#fde047]/35"
                        : "border-[#163a5f]/40 bg-gradient-to-br from-neutral-100 to-white ring-[#163a5f]/12"
                    }`}
                  >
                    <span className="marketing-icon-wobble relative inline-flex">
                      <Mic
                        className={`relative z-[1] h-16 w-16 sm:h-20 sm:w-20 ${
                          isDark
                            ? "text-[#fffef5] drop-shadow-[0_0_26px_rgba(253,224,71,0.95)]"
                            : "text-[#163a5f] drop-shadow-[0_2px_6px_rgba(22,58,95,0.12)]"
                        }`}
                        strokeWidth={isDark ? 2 : 2.25}
                      />
                    </span>
                  </div>
                </div>
                <div className="text-center">
                  <p
                    className={`text-sm font-medium leading-snug ${
                      isDark ? "text-neutral-300" : "text-neutral-700"
                    }`}
                  >
                    Tap to speak — same experience as the live app
                  </p>
                  <Link
                    href="/assistant"
                    className={`marketing-hero-mic-link mt-3 inline-flex items-center gap-1 text-sm font-semibold underline underline-offset-4 decoration-2 transition-colors ${
                      isDark
                        ? "text-sky-200 decoration-sky-300/55 hover:text-white hover:decoration-white/80"
                        : "text-[#163a5f] decoration-[#163a5f]/50 hover:text-[#0f2740] hover:decoration-current"
                    }`}
                  >
                    Open assistant →
                  </Link>
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
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 sm:grid-cols-4 sm:px-6">
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
          <h2 className={`text-3xl font-bold sm:text-4xl ${isDark ? "text-white" : "text-neutral-900"}`}>Everything guests expect</h2>
          <p className={`mt-4 ${muted}`}>From first question to staff handoff—one surface, consistent quality.</p>
        </Reveal>
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delayMs={i * 70}>
              <div
                className="marketing-card-pulse h-full"
                style={
                  {
                    "--card-y": `${5.2 + (i % 3) * 0.85}s`,
                    "--card-delay": `${-i * 0.55}s`,
                  } as CSSProperties
                }
              >
              <div className={`h-full p-6 ${glassCard}`}>
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-[#163a5f]/25 bg-[#163a5f]/12 text-yellow-900 backdrop-blur-sm dark:border-[#e4c449]/35 dark:bg-[#c9a227]/15 dark:text-[#e4c449]">
                <span className="marketing-icon-wobble inline-flex">
                  <f.icon className="h-5 w-5" />
                </span>
              </div>
              <h3 className={`text-lg font-semibold ${isDark ? "text-white" : "text-neutral-900"}`}>{f.title}</h3>
              <p className={`mt-2 text-sm leading-relaxed ${muted}`}>{f.body}</p>
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
            <h2 className={`text-3xl font-bold sm:text-4xl ${isDark ? "text-white" : "text-neutral-900"}`}>How it works</h2>
            <p className={`mt-4 ${muted}`}>Three beats from hello to measurable guest satisfaction.</p>
          </Reveal>
          <div className="mt-14 grid gap-8 lg:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.step} delayMs={i * 80}>
                <div
                  className="marketing-card-pulse h-full"
                  style={
                    {
                      "--card-y": `${6.4 + (i % 3) * 0.6}s`,
                      "--card-delay": `${-i * 0.7}s`,
                    } as CSSProperties
                  }
                >
                <div className={`h-full p-8 ${glassCard}`}>
                <span className="text-xs font-black text-yellow-700 dark:text-[#e4c449]">{s.step}</span>
                <h3 className={`mt-3 text-xl font-semibold ${isDark ? "text-white" : "text-neutral-900"}`}>{s.title}</h3>
                <p className={`mt-2 text-sm leading-relaxed ${muted}`}>{s.body}</p>
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
        <div className={`glass-panel rounded-3xl border p-8 sm:p-12 lg:p-16 ${glassHoverGlow} shadow-[0_20px_60px_-24px_rgba(15,23,42,0.25)]`}>
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <Globe2 className="marketing-icon-wobble h-10 w-10 text-[#163a5f] dark:text-[#e4c449]" />
              <h2 className={`mt-6 text-3xl font-bold sm:text-4xl ${isDark ? "text-white" : "text-neutral-900"}`}>Speak globally, sound local</h2>
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
            <div className="flex flex-wrap content-start gap-2">
              {LANGS.map((lang) => (
                <span
                  key={lang}
                  className={`marketing-pill-bob rounded-xl border px-3 py-2 text-xs font-semibold backdrop-blur-md transition hover:scale-110 hover:border-[#c9a227]/55 ${isDark ? "glass-chip border-white/12 bg-white/[0.04]" : "border-neutral-200/80 bg-white/70"}`}
                >
                  {lang}
                </span>
              ))}
            </div>
          </div>
        </div>
        </Reveal>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <Reveal delayMs={40}>
        <div className="glass-panel relative overflow-hidden rounded-3xl border border-[#163a5f]/35 bg-[#163a5f]/10 p-[1px] shadow-[0_28px_80px_-28px_rgba(22,58,95,0.45)] backdrop-blur-xl">
        <div className="relative overflow-hidden rounded-[calc(1.5rem-1px)] bg-gradient-to-br from-[#0f2844] via-[#163a5f] to-[#9a7614] p-10 text-center sm:p-14">
          <div className="marketing-hero-scan pointer-events-none absolute left-1/2 top-1/2 aspect-square h-[min(920px,150vw)] w-[min(920px,150vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[conic-gradient(from_185deg,rgba(250,204,21,0.82),transparent_28%,rgba(42,94,148,0.72)_48%,transparent_62%,rgba(232,212,73,0.92)_82%,transparent)] blur-[92px]" aria-hidden />
          <div className="animate-pulse-soft absolute -left-20 top-10 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_55%)]" />
          <div className="relative">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">Ready when your guests are</h2>
            <p className="mx-auto mt-4 max-w-xl text-sm text-white/85 sm:text-base">
              Jump into the live voice experience—configure your property afterward from the admin dashboard.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/assistant"
                className="marketing-badge-pulse inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-[#163a5f] shadow-xl transition hover:scale-[1.02] hover:bg-neutral-100 sm:w-auto"
              >
                Try now — open assistant
                <Mic className="h-5 w-5" />
              </Link>
              <Link
                href="/admin/register"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/45 bg-white/10 px-8 py-4 text-base font-semibold text-white backdrop-blur-md transition hover:scale-[1.02] hover:bg-white/[0.18] sm:w-auto"
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
