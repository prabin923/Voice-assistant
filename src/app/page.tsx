"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Globe2,
  Headphones,
  Mic,
  Moon,
  PhoneCall,
  Shield,
  Sparkles,
  Sun,
  Zap,
} from "lucide-react";
import { StaynepLogo } from "@/components/StaynepLogo";
import { SiteShellBackdrop, siteHeaderChrome } from "@/components/SiteShellBackdrop";
import { Reveal } from "@/components/Reveal";

const FEATURES = [
  {
    title: "Human cadence, not robot scripts",
    body: "Guests speak naturally. Willow catches context and responds with polished, hospitality-grade tone.",
    icon: Mic,
  },
  {
    title: "One assistant, multilingual by default",
    body: "Language shifts happen instantly, so international guests get help without waiting for staff translation.",
    icon: Globe2,
  },
  {
    title: "Built for web and call channels",
    body: "From room phones to lobby kiosks, interactions remain consistent and brand-safe across surfaces.",
    icon: PhoneCall,
  },
  {
    title: "Answers from your playbook",
    body: "Upload policies once and every response aligns with your property's tone, rules, and operations.",
    icon: Sparkles,
  },
  {
    title: "Escalation with context preserved",
    body: "Complex requests route to staff with summaries attached, so handoffs feel smooth instead of fragmented.",
    icon: Headphones,
  },
  {
    title: "Configurable and secure",
    body: "Voice persona, brand rules, and admin control stay centralized for confident day-to-day operations.",
    icon: Shield,
  },
];

const STEPS = [
  { step: "01", title: "Activate your concierge identity", body: "Set property details, voice style, and escalation defaults in one pass." },
  { step: "02", title: "Guests speak naturally", body: "No command syntax required. They ask in their own words and get immediate voice responses." },
  { step: "03", title: "Refine from operations data", body: "Tune replies, monitor patterns, and harden edge cases from the admin dashboard." },
];

const LANGS = ["English", "Spanish", "French", "Arabic", "Japanese", "Hindi", "German", "Portuguese", "+26 more"];

export default function MarketingHomePage() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    const saved = window.localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return saved === "light" || saved === "dark" ? saved : prefersDark ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  const isDark = theme === "dark";
  const muted = isDark ? "text-neutral-300" : "text-neutral-600";
  const border = isDark ? "border-white/10" : "border-neutral-200";
  const statStripe = isDark ? "border-white/10 bg-white/[0.04] backdrop-blur-2xl" : "border-neutral-200/90 bg-white/70 backdrop-blur-2xl";

  return (
    <div className={`ac-grid-bg va-noise relative min-h-screen overflow-hidden ${isDark ? "text-neutral-100" : "text-neutral-900"}`}>
      <SiteShellBackdrop isDark={isDark} />

      <div className="relative z-10">
        <header className={`sticky top-0 z-50 border-b backdrop-blur-xl ${siteHeaderChrome(isDark)}`}>
          <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
            <div className={`ac-border-beam relative flex items-center justify-between gap-3 rounded-2xl border px-3 py-2 sm:px-4 ${
              isDark ? "border-white/10 bg-black/40" : "border-neutral-200 bg-white/85"
            }`}>
              <Link href="/" className="-ml-0.5 flex shrink-0 items-center">
                <StaynepLogo isDark={isDark} size="md" priority />
              </Link>
              <nav className={`hidden md:flex items-center gap-2 rounded-xl border px-2 py-1 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-neutral-200 bg-white/80"}`}>
                <a href="#features" className={`nav-link-glide rounded-lg px-3 py-1.5 text-sm font-medium ${isDark ? "text-neutral-300 hover:text-[#e8c96a]" : "text-neutral-600 hover:text-[#163a5f]"}`}>Features</a>
                <a href="#how" className={`nav-link-glide rounded-lg px-3 py-1.5 text-sm font-medium ${isDark ? "text-neutral-300 hover:text-[#e8c96a]" : "text-neutral-600 hover:text-[#163a5f]"}`}>Flow</a>
                <a href="#languages" className={`nav-link-glide rounded-lg px-3 py-1.5 text-sm font-medium ${isDark ? "text-neutral-300 hover:text-[#e8c96a]" : "text-neutral-600 hover:text-[#163a5f]"}`}>Languages</a>
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
                  className="marketing-nav-cta-pop inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#0f2844] via-[#1a456f] to-[#926f18] px-4 py-2 text-sm font-semibold text-white"
                >
                  Enter demo
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </header>

        <section className="relative mx-auto max-w-6xl px-4 pb-14 pt-10 sm:px-6 sm:pb-16 sm:pt-20 lg:pb-24">
          <div className="ac-spotlight pointer-events-none absolute inset-0 -z-10" aria-hidden />
          <div className="pointer-events-none absolute left-[-10%] top-[8%] -z-10 h-72 w-72 rounded-full bg-[#d1a93a]/25 blur-[100px]" aria-hidden />
          <div className="pointer-events-none absolute right-[-6%] top-[10%] -z-10 h-96 w-96 rounded-full bg-[#1e5278]/45 blur-[120px]" aria-hidden />
          <div className="grid items-center gap-9 sm:gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="relative">
              <p className={`hero-intro hero-intro-delay-1 mb-4 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] sm:text-[11px] ${isDark ? "border-[#fde047]/40 bg-[#dab52d]/12 text-[#fde047]" : "border-[#163a5f]/30 bg-white/80 text-[#163a5f]"}`}>
                <Zap className="h-3 w-3" />
                Distinctive Voice Receptionist
              </p>
              <h1
                className={`hero-intro hero-intro-delay-2 va-display text-balance leading-[0.92] ${isDark ? "text-[#f8f5eb]" : "text-[#0f2844]"}`}
                style={{ fontSize: "clamp(2.2rem, 5.2vw, 4.7rem)" }}
              >
                Check-in meets
                <span className="marketing-headline-shift block">a voice receptionist with presence.</span>
              </h1>
              <p className={`hero-intro hero-intro-delay-3 mt-5 max-w-xl text-[15px] leading-relaxed sm:mt-6 sm:text-lg ${muted}`}>
                A premium voice receptionist experience for StayNEP: natural cadence, multilingual clarity, and confident escalation—wrapped in an atmosphere guests feel.
              </p>
              <div className="hero-intro hero-intro-delay-4 mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row">
                <Link
                  href="/assistant"
                  className="marketing-cta-primary inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0f2844] via-[#1e5278] to-[#9f7b1d] px-7 py-4 text-sm font-semibold text-white sm:w-auto"
                >
                  Launch voice demo
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/admin/register"
                  className={`inline-flex w-full items-center justify-center rounded-2xl border px-7 py-4 text-sm font-semibold sm:w-auto ${isDark ? "glass-chip border-white/20 hover:border-[#fde047]/40" : "glass-chip border-neutral-200/90 hover:border-[#163a5f]/30"}`}
                >
                  Register hotel
                </Link>
              </div>
            </div>
            <div className="hero-intro hero-intro-delay-4">
              <div className={`ac-border-beam glass-panel relative overflow-hidden rounded-[1.9rem] border p-1.5 ${isDark ? "border-white/[0.12]" : "border-neutral-200/70"}`}>
                <div className={`rounded-[1.55rem] border p-5 sm:p-6 ${isDark ? "border-white/[0.08] bg-[radial-gradient(ellipse_120%_90%_at_50%_-20%,rgba(30,82,120,0.72)_0%,rgba(10,18,30,0.95)_48%,rgba(5,8,14,0.98)_100%)]" : "border-neutral-200/80 bg-gradient-to-b from-white via-white to-neutral-50"}`}>
                  <div className="grid gap-4 sm:grid-cols-[1.05fr_0.95fr]">
                    <div className={`ac-bento-card rounded-2xl border p-4 sm:p-5 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-neutral-200 bg-white"}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${isDark ? "text-[#e8c96a]" : "text-[#163a5f]"}`}>Now Listening</p>
                      <div className="relative mt-4 flex h-24 items-center justify-center sm:mt-5 sm:h-28">
                        <div className="marketing-ring-pulse-ring absolute inset-auto h-24 w-24 opacity-65" />
                        <div className={`relative flex h-20 w-20 items-center justify-center rounded-full border-2 ${isDark ? "border-[#fde047]/55 bg-[#163a5f]" : "border-[#163a5f]/40 bg-white"}`}>
                          <Mic className={`h-8 w-8 ${isDark ? "text-[#fff8dc]" : "text-[#163a5f]"}`} />
                        </div>
                      </div>
                      <p className={`mt-4 text-sm ${muted}`}>Guests ask naturally. The assistant translates intent into concierge-grade action.</p>
                    </div>
                    <div className="grid gap-4">
                      <div className={`ac-bento-card rounded-2xl border p-4 ${isDark ? "border-[#e8c96a]/20 bg-[#d1a93a]/10" : "border-[#163a5f]/20 bg-[#163a5f]/[0.05]"}`}>
                        <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${isDark ? "text-[#fde047]" : "text-[#163a5f]"}`}>Response Quality</p>
                        <p className={`mt-2 text-3xl font-black ${isDark ? "text-white" : "text-neutral-900"}`}>97%</p>
                        <p className={`text-xs ${muted}`}>Useful first response rate</p>
                      </div>
                      <div className={`ac-bento-card rounded-2xl border p-4 ${isDark ? "border-[#6ea4c7]/30 bg-[#6ea4c7]/10" : "border-[#6ea4c7]/45 bg-[#eaf3f9]/80"}`}>
                        <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${isDark ? "text-[#9ec1da]" : "text-[#305d7a]"}`}>Channels</p>
                        <p className={`mt-2 text-lg font-black ${isDark ? "text-white" : "text-neutral-900"}`}>Web + Call</p>
                        <p className={`text-xs ${muted}`}>Unified conversation experience</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Reveal>
          <section className={`marketing-strip-glare relative overflow-hidden border-y ${statStripe}`}>
            <div className="marketing-strip-shimmer" aria-hidden />
            <div className="mx-auto grid max-w-6xl grid-cols-2 gap-5 px-4 py-7 sm:grid-cols-4 sm:px-6 sm:py-8">
              {[
                { label: "Languages", value: "34+" },
                { label: "Median response", value: "1.1s" },
                { label: "Mode", value: "Voice + call" },
                { label: "Built for", value: "Hotels" },
              ].map((s, i) => (
                <div key={s.label} className="text-center">
                  <p className="marketing-stat-num text-2xl font-bold text-yellow-700 sm:text-3xl dark:text-[#e4c449]" style={{ animationDelay: `${i * 0.5}s` } as CSSProperties}>
                    {s.value}
                  </p>
                  <p className={`mt-1 text-xs font-semibold uppercase tracking-wider ${muted}`}>{s.label}</p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6 sm:py-24">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className={`va-display text-3xl sm:text-5xl ${isDark ? "text-white" : "text-neutral-900"}`}>A voice receptionist guests actually remember</h2>
            <p className={`mt-4 ${muted}`}>Concierge-grade cadence, multilingual clarity, and graceful handoffs—built for hospitality.</p>
          </Reveal>
          <div className="mt-14 grid gap-4 lg:grid-cols-12">
            {FEATURES.map((f, i) => {
              const span = i === 0 || i === 3 ? "lg:col-span-7" : "lg:col-span-5";
              return (
                <Reveal key={f.title} delayMs={i * 60} className={span}>
                  <article className={`ac-bento-card group h-full rounded-3xl border p-4 sm:p-5 transition-all duration-300 hover:-translate-y-1 ${isDark ? "border-white/10 bg-[#0d1622]/70 hover:border-[#e8c96a]/35" : "border-neutral-200 bg-white hover:border-[#6ea4c7]/55"}`}>
                    <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border ${isDark ? "border-white/12 bg-white/[0.04]" : "border-neutral-200 bg-white"}`}>
                      <f.icon className={`h-5 w-5 ${isDark ? "text-[#f4edd8]" : "text-[#163a5f]"}`} />
                    </div>
                    <h3 className={`text-xl font-semibold ${isDark ? "text-white" : "text-neutral-900"}`}>{f.title}</h3>
                    <p className={`mt-3 text-sm leading-7 ${muted}`}>{f.body}</p>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </section>

        <section id="how" className="section-how-animated relative scroll-mt-24 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className={`va-display text-3xl sm:text-5xl ${isDark ? "text-white" : "text-neutral-900"}`}>How the system performs</h2>
              <p className={`mt-4 ${muted}`}>Three operational beats, from identity setup to ongoing optimization.</p>
            </Reveal>
            <div className="mt-14 grid gap-4 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <Reveal key={s.step} delayMs={i * 80}>
                  <div className="marketing-card-pulse h-full" style={{ "--card-y": `${6.2 + i * 0.3}s`, "--card-delay": `${-i * 0.65}s` } as CSSProperties}>
                    <article className={`rounded-3xl border p-5 ${isDark ? "border-white/10 bg-[#0d1622]/75" : "border-neutral-200 bg-white/95"}`}>
                      <p className={`text-xs font-black tracking-[0.14em] ${isDark ? "text-[#e8c96a]" : "text-[#163a5f]"}`}>{s.step}</p>
                      <h3 className={`mt-3 text-lg font-semibold ${isDark ? "text-white" : "text-neutral-900"}`}>{s.title}</h3>
                      <p className={`mt-2 text-sm leading-7 ${muted}`}>{s.body}</p>
                    </article>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="languages" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24 sm:px-6">
          <Reveal>
            <div className={`ac-border-beam glass-panel rounded-3xl border p-8 sm:p-10 ${isDark ? "border-white/10" : "border-neutral-200/80"}`}>
              <div className="grid gap-8 lg:grid-cols-[1fr_1.15fr]">
                <div>
                  <Globe2 className="marketing-icon-wobble h-10 w-10 text-[#163a5f] dark:text-[#e4c449]" />
                  <h2 className={`va-display mt-5 text-3xl sm:text-5xl ${isDark ? "text-white" : "text-neutral-900"}`}>Speak global. Feel local.</h2>
                  <p className={`mt-4 ${muted}`}>
                    Voice selection, pacing, and fallbacks are tuned so multilingual support feels crafted rather than machine-generated.
                  </p>
                  <ul className="mt-7 space-y-3">
                    {["Browser speech where available", "Server transcription fallback", "Hospitality-tuned delivery cadence"].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm font-medium">
                        <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                        <span className={isDark ? "text-neutral-300" : "text-neutral-700"}>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="grid gap-4">
                  <div className={`ac-bento-card rounded-2xl border p-5 ${isDark ? "border-white/10 bg-white/[0.04]" : "border-neutral-200 bg-white/90"}`}>
                    <p className={`mb-3 text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-[#e8c96a]" : "text-[#163a5f]"}`}>Supported Languages</p>
                    <div className="flex flex-wrap gap-2">
                      {LANGS.map((lang) => (
                        <span key={lang} className={`marketing-pill-bob rounded-xl border px-3 py-2 text-xs font-semibold ${isDark ? "border-white/12 bg-white/[0.06] text-neutral-200" : "border-neutral-200/80 bg-white text-neutral-700"}`}>
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className={`ac-bento-card rounded-2xl border p-5 ${isDark ? "border-[#6ea4c7]/25 bg-[#6ea4c7]/[0.08]" : "border-[#6ea4c7]/45 bg-[#eaf3f9]/75"}`}>
                      <p className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-[#9ec1da]" : "text-[#305d7a]"}`}>Coverage</p>
                      <p className={`mt-2 text-3xl font-black ${isDark ? "text-white" : "text-neutral-900"}`}>34+</p>
                    </div>
                    <div className={`ac-bento-card rounded-2xl border p-5 ${isDark ? "border-[#e8c96a]/24 bg-[#d1a93a]/[0.09]" : "border-[#163a5f]/18 bg-[#163a5f]/[0.05]"}`}>
                      <p className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-[#e8c96a]" : "text-[#163a5f]"}`}>Availability</p>
                      <p className={`mt-2 text-3xl font-black ${isDark ? "text-white" : "text-neutral-900"}`}>24/7</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-24">
          <Reveal delayMs={40}>
            <div className="ac-border-beam glass-panel relative overflow-hidden rounded-3xl border border-[#163a5f]/35 bg-[#163a5f]/10 p-[1px]">
              <div className="relative overflow-hidden rounded-[calc(1.5rem-1px)] bg-gradient-to-br from-[#0f2844] via-[#163a5f] to-[#9a7614] p-6 sm:p-10">
                <div className="marketing-hero-scan pointer-events-none absolute left-1/2 top-1/2 h-[min(860px,140vw)] w-[min(860px,140vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[conic-gradient(from_185deg,rgba(250,204,21,0.82),transparent_28%,rgba(42,94,148,0.72)_48%,transparent_62%,rgba(232,212,73,0.92)_82%,transparent)] blur-[92px]" aria-hidden />
                <div className="relative grid items-center gap-5 sm:gap-6 lg:grid-cols-[1fr_auto]">
                  <div>
                    <h2 className="va-display text-white" style={{ fontSize: "clamp(1.85rem, 4.8vw, 3.35rem)", lineHeight: 0.94 }}>
                      Ready for unforgettable guest conversations?
                    </h2>
                    <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-white/85 sm:mt-4 sm:text-base">
                      Open the live voice flow now. Fine-tune behavior, guardrails, and analytics from your admin controls.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:min-w-[260px]">
                    <Link href="/assistant" className="marketing-badge-pulse inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-7 py-4 text-[15px] font-semibold text-[#163a5f] sm:w-auto sm:px-8 sm:text-base">
                      Open assistant
                      <Mic className="h-5 w-5" />
                    </Link>
                    <Link href="/admin/register" className="inline-flex w-full items-center justify-center rounded-xl border border-white/45 bg-white/10 px-7 py-4 text-[15px] font-semibold text-white sm:w-auto sm:px-8 sm:text-base">
                      Register hotel
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        <footer className={`border-t py-14 backdrop-blur-xl ${border} ${isDark ? "bg-black/35" : "bg-neutral-50/85"}`}>
          <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
            <div>
              <StaynepLogo isDark={isDark} size="lg" className="max-w-[220px]" />
              <p className={`mt-4 max-w-xs text-sm ${muted}`}>Voice-first concierge experiences for modern hospitality teams.</p>
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
                </ul>
              </div>
            </div>
          </div>
          <p className={`mx-auto mt-12 max-w-6xl px-4 text-center text-xs sm:px-6 ${muted}`}>
            © {new Date().getFullYear()} StayNEP · Distinctive voice concierge service
          </p>
        </footer>
      </div>
    </div>
  );
}
