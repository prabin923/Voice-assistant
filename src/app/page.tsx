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
  ShieldCheck,
  Sparkles,
  Sun,
} from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { SiteShellBackdrop, siteHeaderChrome } from "@/components/SiteShellBackdrop";
import { StaynepLogo } from "@/components/StaynepLogo";

const STAYNEP_SITE = "https://staynep.com";

const STORY_STEPS = [
  {
    kicker: "Listen",
    title: "A guest asks in the language they already use.",
    body: "The assistant waits through natural pauses, catches intent, and keeps the conversation calm instead of forcing a form-like script.",
    stat: "34+",
    label: "languages",
    flow: ["Speech", "Intent", "Reply"],
    accent: "#8ee8ff",
    icon: Globe2,
  },
  {
    kicker: "Reason",
    title: "Policies, room context, and escalation rules shape every reply.",
    body: "Answers stay inside the hotel playbook: check-in windows, amenities, cancellations, transfers, and handoff paths.",
    stat: "24/7",
    label: "coverage",
    flow: ["Policy", "Context", "Guardrail"],
    accent: "#f8d36a",
    icon: ShieldCheck,
  },
  {
    kicker: "Act",
    title: "Staff see what matters, not a pile of transcripts.",
    body: "Requests, unresolved questions, and guest sentiment flow into admin views so operations can move without hunting.",
    stat: "1",
    label: "desk",
    flow: ["Summary", "Priority", "Handoff"],
    accent: "#c9b7ff",
    icon: BarChart3,
  },
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
    href: "/assistant",
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

function AssistantOrb({ isDark }: { isDark: boolean }) {
  return (
    <div className="kiddo-stage" aria-hidden="true">
      <div className="kiddo-particle kiddo-particle-1" />
      <div className="kiddo-particle kiddo-particle-2" />
      <div className="kiddo-particle kiddo-particle-3" />
      <div className="kiddo-particle kiddo-particle-4" />
      <div className="kiddo-orbit kiddo-orbit-one" />
      <div className="kiddo-orbit kiddo-orbit-two" />
      <div className={`kiddo-core ${isDark ? "kiddo-core-dark" : "kiddo-core-light"}`}>
        <div className="kiddo-face">
          <span />
          <span />
        </div>
        <div className="kiddo-mouth" />
      </div>
      <div className="kiddo-shadow" />
    </div>
  );
}

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
            {["story", "services", "system"].map((item) => (
              <a key={item} href={`#${item}`} className="kiddo-nav-link rounded-full px-4 py-2 capitalize">
                {item}
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
            <Link href="/assistant" className="kiddo-button kiddo-button-primary">
              Demo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative min-h-[calc(92vh-68px)] overflow-hidden">
        <div className="kiddo-hero-grid mx-auto grid min-h-[calc(92vh-68px)] max-w-7xl items-center gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:py-16">
          <div className="relative z-10 max-w-3xl">
            <div className={`hero-intro hero-intro-delay-1 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] ${isDark ? "border-cyan-300/20 bg-cyan-300/8 text-cyan-100" : "border-[#163a5f]/18 bg-white text-[#163a5f]"}`}>
              <Sparkles className="h-3.5 w-3.5" />
              AI voice receptionist
            </div>
            <h1 className="hero-intro hero-intro-delay-2 va-display mt-6 max-w-3xl text-balance text-[clamp(2.35rem,5.35vw,5rem)] leading-[0.94]">
              The hotel assistant guests actually want to talk to.
            </h1>
            <p className={`hero-intro hero-intro-delay-3 mt-6 max-w-xl text-[15px] leading-7 sm:text-base ${muted}`}>
              A StayNEP voice layer with the charm of a visible AI companion and the discipline of a front desk system: multilingual listening, policy-aware replies, and clean staff escalation.
            </p>
            <div className="hero-intro hero-intro-delay-4 mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/assistant" className="kiddo-button kiddo-button-primary kiddo-button-large">
                Try voice demo
                <Mic className="h-5 w-5" />
              </Link>
              <a href={STAYNEP_SITE} target="_blank" rel="noopener noreferrer" className={`kiddo-button kiddo-button-large ${isDark ? "kiddo-button-dark" : "kiddo-button-light"}`}>
                View StayNEP
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="hero-intro hero-intro-delay-5 relative min-h-[360px] lg:min-h-[540px]">
            <div className="kiddo-pin-card kiddo-pin-card-top">
              <span>Guest asks</span>
              <strong>Late check-in?</strong>
            </div>
            <AssistantOrb isDark={isDark} />
            <div className="kiddo-pin-card kiddo-pin-card-bottom">
              <span>Assistant replies</span>
              <strong>Policy-safe handoff</strong>
            </div>
          </div>
        </div>
      </section>

      <section id="story" className="relative scroll-mt-24 py-10 sm:py-14">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.78fr_1.08fr]">
          <div className="sticky top-28 hidden h-[calc(82vh-8rem)] items-center lg:flex">
            <AssistantOrb isDark={isDark} />
          </div>
          <div className="space-y-5 lg:space-y-7">
            {STORY_STEPS.map((step, index) => (
              <Reveal key={step.title} delayMs={index * 80}>
                <article
                  className={`kiddo-story-panel min-h-[340px] rounded-[1.35rem] border ${panel}`}
                  style={{ "--story-accent": step.accent } as CSSProperties}
                >
                  <div className="kiddo-story-rail" aria-hidden="true">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                  </div>

                  <div className="kiddo-story-content">
                    <div className="flex items-start justify-between gap-5">
                      <div className="flex items-center gap-3">
                        <div className="kiddo-story-icon">
                          <step.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="kiddo-story-kicker">{step.kicker}</p>
                          <p className={`mt-1 text-xs font-semibold ${muted}`}>Voice system step</p>
                        </div>
                      </div>
                      <div className="kiddo-story-metric">
                        <p className="kiddo-stat">{step.stat}</p>
                        <p className={muted}>{step.label}</p>
                      </div>
                    </div>

                    <div className="mt-8">
                      <div>
                        <h2 className="va-display max-w-xl text-balance text-[clamp(1.72rem,2.65vw,2.85rem)] leading-[1]">{step.title}</h2>
                        <p className={`mt-4 max-w-xl text-sm leading-7 ${muted}`}>{step.body}</p>
                      </div>
                      <div className="kiddo-story-flow mt-6" aria-label={`${step.kicker} workflow`}>
                        {step.flow.map((item) => (
                          <span key={item}>{item}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="services" className="scroll-mt-24 py-12 sm:py-18">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal className="max-w-3xl">
            <p className={`text-xs font-black uppercase tracking-[0.24em] ${isDark ? "text-[#f8d36a]" : "text-[#9f7b1d]"}`}>Guest paths</p>
            <h2 className="va-display mt-4 max-w-4xl text-balance text-[clamp(2.05rem,4vw,4.2rem)] leading-[0.94]">Not a mascot. A working front desk interface.</h2>
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
                  <span className={`mt-8 text-sm font-bold ${isDark ? "text-[#8ee8ff]" : "text-[#163a5f]"}`}>{item.external ? "Open flow" : "Launch demo"}</span>
                </a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="system" className="scroll-mt-24 px-4 pb-16 sm:px-6 sm:pb-22">
        <Reveal>
          <div className={`kiddo-system mx-auto grid max-w-7xl gap-8 rounded-[1.75rem] border p-6 sm:p-8 lg:grid-cols-[1fr_0.8fr] ${panel}`}>
            <div>
              <div className="flex items-center gap-3">
                <Hotel className={isDark ? "text-[#f8d36a]" : "text-[#163a5f]"} />
                <p className={`text-xs font-black uppercase tracking-[0.24em] ${muted}`}>StayNEP system</p>
              </div>
              <h2 className="va-display mt-5 max-w-3xl text-balance text-[clamp(1.9rem,3.7vw,3.8rem)] leading-[0.94]">Hospitality-grade motion, restrained enough for work.</h2>
              <p className={`mt-5 max-w-2xl text-[15px] leading-7 ${muted}`}>
                The visual language borrows the reference&apos;s friendly 3D brain and particle motion, then grounds it in a hotel product surface: clear CTAs, direct service paths, and operational credibility.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {TRUST_POINTS.map((point) => (
                  <div key={point} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${isDark ? "border-white/10 bg-black/20" : "border-slate-200 bg-white/65"}`}>
                    <Check className="h-4 w-4 text-emerald-500" />
                    {point}
                  </div>
                ))}
              </div>
            </div>
            <div className="kiddo-console">
              <div className="kiddo-console-header">
                <span />
                <span />
                <span />
              </div>
              <div className="space-y-4 p-5">
                <div className="kiddo-wave-row">
                  {Array.from({ length: 18 }).map((_, index) => (
                    <span key={index} style={{ "--wave-delay": `${index * 42}ms` } as CSSProperties} />
                  ))}
                </div>
                <div className="rounded-2xl bg-white/[0.07] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Detected intent</p>
                  <p className="mt-2 text-lg font-semibold">Airport pickup after midnight</p>
                </div>
                <div className="rounded-2xl bg-[#8ee8ff]/12 p-4 text-[#dffbff]">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8ee8ff]/70">Action</p>
                  <p className="mt-2 text-lg font-semibold">Escalate to concierge with room context</p>
                </div>
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
