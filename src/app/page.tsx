"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarCheck,
  Check,
  ExternalLink,
  Globe2,
  Headphones,
  Hotel,
  Mic,
  Moon,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Sun,
  Zap,
} from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { SiteShellBackdrop, siteHeaderChrome } from "@/components/SiteShellBackdrop";
import { StaynepLogo } from "@/components/StaynepLogo";
import { VoicePipelineDemo } from "@/components/VoicePipelineDemo";

const STAYNEP_SITE = "https://staynep.com";

const STATS = [
  { value: "34+", label: "Languages supported" },
  { value: "24/7", label: "Guest coverage" },
  { value: "<300ms", label: "Real-time STT target" },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Capture",
    body: "Guests speak naturally — tap-to-talk, browser speech, or a live concierge call. Any accent, any channel.",
    bullets: ["Mic, call, and AI Mode", "Pause-aware listening", "Hotel-branded welcome"],
    accent: "#8ee8ff",
    icon: Mic,
  },
  {
    step: "02",
    title: "Transcribe",
    body: "Speech becomes a clean transcript with intent detection — even when guests switch languages mid-sentence.",
    bullets: ["Whisper or cloud STT", "Partial live transcripts", "Intent + policy matching"],
    accent: "#f8d36a",
    icon: Globe2,
  },
  {
    step: "03",
    title: "Reply",
    body: "Answers stay inside your hotel playbook: check-in windows, amenities, cancellations, and room context.",
    bullets: ["AI voice replies", "Custom FAQ + policies", "Suggested question chips"],
    accent: "#c9b7ff",
    icon: Sparkles,
  },
  {
    step: "04",
    title: "Escalate",
    body: "When automation stops, staff get structured handoffs — not a pile of raw transcripts.",
    bullets: ["Concierge call routing", "Support ticket creation", "Email alerts to front desk"],
    accent: "#7dffb2",
    icon: PhoneCall,
  },
];

const FEATURES = [
  {
    title: "Built for global guests",
    body: "Real conversations rarely stay in one language. The assistant handles accents and code-switching without a separate stack per market.",
    icon: Globe2,
    accent: "from-cyan-400/20 to-sky-500/5",
  },
  {
    title: "Policy-aware by default",
    body: "Every reply is shaped by your hotel config — policies, amenities, room types, and escalation rules configured once in settings.",
    icon: ShieldCheck,
    accent: "from-amber-400/20 to-yellow-500/5",
  },
  {
    title: "Voice that feels live",
    body: "Low-latency spoken replies through AI Mode, with browser speech fallback when needed.",
    icon: Zap,
    accent: "from-violet-400/20 to-purple-500/5",
  },
  {
    title: "Operations-ready handoffs",
    body: "Unresolved requests, sentiment, and call history flow into admin views so your team moves without hunting through logs.",
    icon: BarChart3,
    accent: "from-emerald-400/20 to-green-500/5",
  },
];

const COMPARISON = [
  { feature: "Multilingual voice (34+)", staynep: true, generic: false, phoneTree: false },
  { feature: "Hotel-branded UI + policies", staynep: true, generic: false, phoneTree: false },
  { feature: "Live concierge call", staynep: true, generic: false, phoneTree: true },
  { feature: "AI Mode voice + text", staynep: true, generic: true, phoneTree: false },
  { feature: "Staff escalation + tickets", staynep: true, generic: false, phoneTree: false },
];

const SERVICE_LINKS = [
  {
    title: "Room booking",
    body: "Send guests straight into availability and reservation flows.",
    href: `${STAYNEP_SITE}/rooms`,
    icon: CalendarCheck,
    external: true,
  },
  {
    title: "Concierge handoff",
    body: "Escalate transfers, special requests, and on-property questions.",
    href: `${STAYNEP_SITE}/contact`,
    icon: Headphones,
    external: true,
  },
  {
    title: "Voice demo",
    body: "Try the multilingual receptionist experience in this app.",
    href: "/demo",
    icon: Mic,
    external: false,
  },
];

const TRUST_POINTS = [
  "Hotel-branded responses",
  "CSRF-aware admin auth",
  "Rate limited API routes",
  "Policy-safe handoffs",
];

export default function MarketingHomePage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = window.localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const next = saved === "light" || saved === "dark" ? saved : prefersDark ? "dark" : "light";
    queueMicrotask(() => setTheme(next));
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  const isDark = theme === "dark";
  const muted = isDark ? "text-white/62" : "text-slate-600";
  const panel = isDark ? "border-white/10 bg-white/[0.045]" : "border-slate-200 bg-white/82";
  const accentText = isDark ? "text-[#8ee8ff]" : "text-[#163a5f]";
  const kickerText = isDark ? "text-[#f8d36a]" : "text-[#9f7b1d]";

  return (
    <main className={`va-noise relative min-h-screen overflow-x-hidden ${isDark ? "bg-[#05070d] text-white" : "bg-[#f5f7fb] text-slate-950"}`}>
      <SiteShellBackdrop isDark={isDark} />
      <div className="kiddo-radial-field" aria-hidden />

      <header className={`sticky top-0 z-50 border-b backdrop-blur-xl ${siteHeaderChrome(isDark)}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center">
            <StaynepLogo isDark={isDark} size="md" priority />
          </Link>
          <nav className={`hidden items-center rounded-full border p-1 text-sm font-semibold md:flex ${isDark ? "border-white/10 bg-black/28 text-white/68" : "border-slate-200 bg-white/70 text-slate-600"}`}>
            {[
              { id: "how-it-works", label: "How it works" },
              { id: "features", label: "Features" },
              { id: "paths", label: "Guest paths" },
              { id: "platform", label: "Platform" },
            ].map((item) => (
              <a key={item.id} href={`#${item.id}`} className="kiddo-nav-link rounded-full px-4 py-2">
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
              onClick={() => setTheme((value) => (value === "dark" ? "light" : "dark"))}
              className={`grid h-10 w-10 place-items-center rounded-full border transition hover:-translate-y-0.5 ${isDark ? "border-white/10 bg-white/[0.05] text-white" : "border-slate-200 bg-white text-slate-700"}`}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link href="/demo" className="kiddo-button kiddo-button-primary">
              Demo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:py-20">
          <div className="relative z-10 max-w-2xl">
            <div className={`hero-intro hero-intro-delay-1 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] ${isDark ? "border-cyan-300/20 bg-cyan-300/8 text-cyan-100" : "border-[#163a5f]/18 bg-white text-[#163a5f]"}`}>
              <Sparkles className="h-3.5 w-3.5" />
              AI voice receptionist
            </div>
            <h1 className="hero-intro hero-intro-delay-2 va-display mt-6 text-balance text-[clamp(2.35rem,5.35vw,4.6rem)] leading-[0.94]">
              Turn guest questions into{" "}
              <span className={isDark ? "text-[#8ee8ff]" : "text-[#163a5f]"}>reliable answers</span>
            </h1>
            <p className={`hero-intro hero-intro-delay-3 mt-6 max-w-xl text-[15px] leading-7 sm:text-base ${muted}`}>
              StayNEP voice assistant is the end-to-end concierge layer — capture speech, transcribe intent, reply with hotel policy, and escalate to staff through a single branded experience.
            </p>
            <div className="hero-intro hero-intro-delay-4 mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/demo" className="kiddo-button kiddo-button-primary kiddo-button-large">
                Start voice demo
                <Mic className="h-5 w-5" />
              </Link>
              <Link href="/admin/register" className={`kiddo-button kiddo-button-large ${isDark ? "kiddo-button-dark" : "kiddo-button-light"}`}>
                Register your hotel
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="hero-intro hero-intro-delay-5 relative">
            <VoicePipelineDemo isDark={isDark} />
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
          <div className="landing-stat-grid">
            {STATS.map((stat, index) => (
              <Reveal key={stat.label} delayMs={index * 60}>
                <div className={`landing-stat-card ${panel}`}>
                  <p className={`va-display text-3xl font-bold ${accentText}`}>{stat.value}</p>
                  <p className={`mt-1 text-sm font-semibold ${muted}`}>{stat.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-24 border-t border-white/6 py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal className="max-w-3xl">
            <p className={`text-xs font-black uppercase tracking-[0.24em] ${kickerText}`}>How it works</p>
            <h2 className="va-display mt-4 max-w-4xl text-balance text-[clamp(2rem,4vw,3.6rem)] leading-[0.94]">
              The foundation of every voice concierge
            </h2>
            <p className={`mt-5 max-w-2xl text-[15px] leading-7 ${muted}`}>
              Bad speech-to-text doesn&apos;t just stay in the transcript — it corrupts everything downstream. StayNEP keeps the rest of your guest experience reliable.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {HOW_IT_WORKS.map((step, index) => (
              <Reveal key={step.title} delayMs={index * 70}>
                <article
                  className={`landing-step-card h-full border ${panel}`}
                  style={{ "--story-accent": step.accent } as CSSProperties}
                >
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--story-accent)] to-transparent opacity-60" />
                  <p className="landing-step-number">Step {step.step}</p>
                  <div className={`landing-feature-icon mt-4 ${isDark ? "bg-white/8 text-white" : "bg-slate-100 text-[#163a5f]"}`}>
                    <step.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-xl font-bold tracking-tight">{step.title}</h3>
                  <p className={`mt-3 text-sm leading-7 ${muted}`}>{step.body}</p>
                  <ul className={`mt-5 space-y-2 text-sm font-semibold ${isDark ? "text-white/72" : "text-slate-700"}`}>
                    {step.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-24 py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal className="max-w-3xl">
            <p className={`text-xs font-black uppercase tracking-[0.24em] ${kickerText}`}>Why StayNEP</p>
            <h2 className="va-display mt-4 max-w-4xl text-balance text-[clamp(2rem,4vw,3.6rem)] leading-[0.94]">
              Accurate, multilingual, and built for hotel operations
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {FEATURES.map((feature, index) => (
              <Reveal key={feature.title} delayMs={index * 70}>
                <article className={`group relative overflow-hidden rounded-[1.35rem] border p-6 sm:p-7 ${panel}`}>
                  <div className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${feature.accent} blur-2xl transition group-hover:scale-110`} />
                  <div className={`landing-feature-icon ${isDark ? "bg-white/8 text-white" : "bg-slate-100 text-[#163a5f]"}`}>
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-xl font-bold tracking-tight">{feature.title}</h3>
                  <p className={`mt-3 max-w-xl text-sm leading-7 ${muted}`}>{feature.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal className="max-w-3xl">
            <p className={`text-xs font-black uppercase tracking-[0.24em] ${kickerText}`}>Comparison</p>
            <h2 className="va-display mt-4 max-w-3xl text-balance text-[clamp(1.85rem,3.5vw,3rem)] leading-[0.96]">
              See the difference at a glance
            </h2>
          </Reveal>

          <Reveal delayMs={80}>
            <div className={`mt-10 overflow-hidden rounded-[1.35rem] border ${panel}`}>
              <div className={`landing-comparison-row text-xs font-black uppercase tracking-[0.14em] ${isDark ? "bg-white/[0.03] text-white/45" : "bg-slate-50 text-slate-500"}`}>
                <span>Capability</span>
                <span className={accentText}>StayNEP</span>
                <span>Generic chatbot</span>
                <span>Phone tree</span>
              </div>
              {COMPARISON.map((row) => (
                <div key={row.feature} className={`landing-comparison-row border-t text-sm ${isDark ? "border-white/8" : "border-slate-200"}`}>
                  <span className="font-semibold">{row.feature}</span>
                  {[row.staynep, row.generic, row.phoneTree].map((value, index) => (
                    <span key={index} className="flex items-center gap-2">
                      {value ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-500" />
                          <span className={index === 0 ? accentText : muted}>Included</span>
                        </>
                      ) : (
                        <span className={muted}>—</span>
                      )}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Guest paths */}
      <section id="paths" className="scroll-mt-24 py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal className="max-w-3xl">
            <p className={`text-xs font-black uppercase tracking-[0.24em] ${kickerText}`}>Guest paths</p>
            <h2 className="va-display mt-4 max-w-4xl text-balance text-[clamp(2rem,4vw,3.6rem)] leading-[0.94]">
              Ship in hours, not weeks
            </h2>
            <p className={`mt-5 max-w-2xl text-[15px] leading-7 ${muted}`}>
              Plug the assistant into the flows your guests already use — voice demo, room booking, and concierge handoff from one branded surface.
            </p>
          </Reveal>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {SERVICE_LINKS.map((item, index) => (
              <Reveal key={item.title} delayMs={index * 70}>
                <a
                  href={item.href}
                  {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className={`kiddo-service group flex min-h-[260px] flex-col justify-between rounded-[1.4rem] border p-6 ${panel}`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className={`grid h-12 w-12 place-items-center rounded-2xl ${isDark ? "bg-white/8 text-white" : "bg-slate-100 text-[#163a5f]"}`}>
                        <item.icon className="h-6 w-6" />
                      </div>
                      {item.external ? <ExternalLink className="h-4 w-4 opacity-50" /> : <ArrowRight className="h-4 w-4 opacity-50 transition group-hover:translate-x-1" />}
                    </div>
                    <h3 className="mt-9 text-xl font-bold tracking-tight">{item.title}</h3>
                    <p className={`mt-3 text-sm leading-7 ${muted}`}>{item.body}</p>
                  </div>
                  <span className={`mt-8 text-sm font-bold ${accentText}`}>{item.external ? "Open flow" : "Launch demo"}</span>
                </a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Platform / CTA */}
      <section id="platform" className="scroll-mt-24 px-4 pb-16 sm:px-6 sm:pb-22">
        <Reveal>
          <div className={`kiddo-system mx-auto grid max-w-7xl gap-8 rounded-[1.75rem] border p-6 sm:p-8 lg:grid-cols-[1fr_0.92fr] ${panel}`}>
            <div>
              <div className="flex items-center gap-3">
                <Hotel className={isDark ? "text-[#f8d36a]" : "text-[#163a5f]"} />
                <p className={`text-xs font-black uppercase tracking-[0.24em] ${muted}`}>StayNEP platform</p>
              </div>
              <h2 className="va-display mt-5 max-w-3xl text-balance text-[clamp(1.9rem,3.7vw,3.4rem)] leading-[0.94]">
                Ready to build with StayNEP?
              </h2>
              <p className={`mt-5 max-w-2xl text-[15px] leading-7 ${muted}`}>
                Configure your hotel brand, policies, and escalation paths in settings. Guests get a polished voice concierge; staff get structured handoffs when automation stops.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {TRUST_POINTS.map((point) => (
                  <div key={point} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${isDark ? "border-white/10 bg-black/20" : "border-slate-200 bg-white/65"}`}>
                    <Check className="h-4 w-4 text-emerald-500" />
                    {point}
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/demo" className="kiddo-button kiddo-button-primary kiddo-button-large">
                  Try voice demo
                  <Mic className="h-5 w-5" />
                </Link>
                <a href={STAYNEP_SITE} target="_blank" rel="noopener noreferrer" className={`kiddo-button kiddo-button-large ${isDark ? "kiddo-button-dark" : "kiddo-button-light"}`}>
                  View StayNEP
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className={`border-t py-10 ${isDark ? "border-white/10 bg-black/30" : "border-slate-200 bg-white/70"}`}>
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <StaynepLogo isDark={isDark} size="md" />
          <div className={`flex flex-wrap gap-x-5 gap-y-2 ${muted}`}>
            <Link href="/admin/login" className="hover:text-current">Admin</Link>
            <Link href="/admin/register" className="hover:text-current">Register hotel</Link>
            <a href={`${STAYNEP_SITE}/contact`} target="_blank" rel="noopener noreferrer" className="hover:text-current">Policies</a>
          </div>
          <p className={muted}>© {new Date().getFullYear()} STAYNEP voice assistant</p>
        </div>
      </footer>
    </main>
  );
}
