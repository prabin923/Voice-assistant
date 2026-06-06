"use client";

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
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { CountUpStat } from "@/components/CountUpStat";
import { GsapLandingAnimations } from "@/components/GsapLandingAnimations";
import { SiteShellBackdrop, siteHeaderChrome } from "@/components/SiteShellBackdrop";
import { SpectrogramWaveform } from "@/components/SpectrogramWaveform";
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
    icon: Mic,
  },
  {
    step: "02",
    title: "Transcribe",
    body: "Speech becomes a clean transcript with intent detection — even when guests switch languages mid-sentence.",
    bullets: ["Whisper or cloud STT", "Partial live transcripts", "Intent + policy matching"],
    icon: Globe2,
  },
  {
    step: "03",
    title: "Reply",
    body: "Answers stay inside your hotel playbook: check-in windows, amenities, cancellations, and room context.",
    bullets: ["AI voice replies", "Custom FAQ + policies", "Suggested question chips"],
    icon: Sparkles,
  },
  {
    step: "04",
    title: "Escalate",
    body: "When automation stops, staff get structured handoffs — not a pile of raw transcripts.",
    bullets: ["Concierge call routing", "Support ticket creation", "Email alerts to front desk"],
    icon: PhoneCall,
  },
];

const FEATURES = [
  {
    title: "Built for global guests",
    body: "Real conversations rarely stay in one language. The assistant handles accents and code-switching without a separate stack per market.",
    icon: Globe2,
  },
  {
    title: "Policy-aware by default",
    body: "Every reply is shaped by your hotel config — policies, amenities, room types, and escalation rules configured once in settings.",
    icon: ShieldCheck,
  },
  {
    title: "Voice that feels live",
    body: "Low-latency spoken replies through AI Mode, with browser speech fallback when needed.",
    icon: Zap,
  },
  {
    title: "Operations-ready handoffs",
    body: "Unresolved requests, sentiment, and call history flow into admin views so your team moves without hunting through logs.",
    icon: BarChart3,
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

const LOGO_STRIP = ["Unity", "ONE", "Intuit", "Delphi", "Housecall Pro", "Cherry"];

export default function MarketingHomePage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-void-canvas text-cream-text">
      <GsapLandingAnimations />
      <SiteShellBackdrop />

      {/* Nav */}
      <header data-gsap="nav" className={`sticky top-0 z-50 border-b ${siteHeaderChrome()}`}>
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="text-lg font-semibold tracking-tight text-cream-text">
            STAYNEP
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {[
              { id: "how-it-works", label: "Product" },
              { id: "features", label: "Features" },
              { id: "paths", label: "Paths" },
              { id: "platform", label: "Platform" },
            ].map((item) => (
              <a key={item.id} href={`#${item.id}`} className="vapi-nav-label">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/demo" className="vapi-btn-ember vapi-btn-compact">
              Demo
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
            </Link>
            <Link href="/admin/register" className="vapi-btn-mint vapi-btn-compact hidden sm:inline-flex">
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="mx-auto max-w-[1200px] px-4 pt-16 pb-8 sm:px-6 sm:pt-24 lg:pt-28">
          <div data-gsap="hero-copy" className="mx-auto max-w-3xl text-center">
            <h1 className="vapi-headline text-balance text-[clamp(2.5rem,6vw,4.25rem)]">
              Turn guest questions into
              <br />
              reliable answers
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-[1.43] text-bone-text">
              StayNEP voice assistant is the end-to-end concierge layer — capture speech, transcribe intent, reply with hotel policy, and escalate to staff.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/demo" className="vapi-btn-ember">
                Request a demo
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
              </Link>
              <Link href="/admin/register" className="vapi-btn-mint">
                Sign up
              </Link>
            </div>

            <div className="mt-12 flex justify-center">
              <Link href="/demo" data-gsap="talk-console" className="vapi-talk-console">
                Talk to StayNEP
                <span className="grid grid-cols-2 gap-0.5">
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className="h-1 w-1 rounded-full bg-void-canvas" />
                  ))}
                </span>
              </Link>
            </div>
          </div>

          <div data-gsap="pipeline" className="mt-14 hidden lg:block">
            <VoicePipelineDemo />
          </div>
        </div>

        <SpectrogramWaveform className="mt-8 sm:mt-12" />
      </section>

      {/* Logo strip */}
      <section data-gsap-section className="vapi-hairline py-10">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-8 px-4 sm:gap-10 sm:px-6">
          {LOGO_STRIP.map((name) => (
            <span
              key={name}
              data-gsap-item
              className="font-mono text-xs uppercase tracking-[0.08em] text-bone-text/70"
            >
              {name}
            </span>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section data-gsap-section className="vapi-hairline py-16 sm:py-20">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-0 px-4 sm:grid-cols-3 sm:px-6">
          {STATS.map((stat, index) => (
            <Reveal key={stat.label} delayMs={index * 100}>
              <div
                data-gsap-card
                className={`vapi-list-item px-6 py-8 text-center sm:py-10 ${
                  index > 0 ? "sm:border-l sm:border-iron-border" : ""
                }`}
              >
                <CountUpStat value={stat.value} label={stat.label} durationMs={1200 + index * 200} />
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" data-gsap-section className="scroll-mt-24 vapi-hairline py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <Reveal className="max-w-2xl">
            <h2 className="vapi-section-heading text-[clamp(2rem,4vw,2.5rem)]">
              The foundation of every voice concierge
            </h2>
            <p className="mt-5 text-base leading-[1.43] text-zinc-mute">
              Bad speech-to-text doesn&apos;t just stay in the transcript — it corrupts everything downstream. StayNEP keeps the rest of your guest experience reliable.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {HOW_IT_WORKS.map((step, index) => (
              <Reveal key={step.title} delayMs={index * 70}>
                <article data-gsap-card className="flex h-full flex-col rounded-[5.6px] border border-iron-border bg-carbon-surface p-6 transition-colors hover:border-steel-border">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[5.6px] border border-iron-border bg-slab-elevated">
                      <step.icon className="h-5 w-5 text-ice-border" strokeWidth={1.5} />
                    </div>
                    <p className="font-mono text-xs uppercase tracking-[0.08em] text-zinc-mute">
                      Step {step.step}
                    </p>
                  </div>

                  <h3 className="mt-5 text-lg font-medium text-cream-text">{step.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-mute">{step.body}</p>

                  <ul className="mt-5 space-y-2 border-t border-iron-border pt-5 text-sm text-bone-text">
                    {step.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint-pulse" strokeWidth={2} />
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
      <section id="features" data-gsap-section className="scroll-mt-24 vapi-hairline py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <Reveal className="max-w-2xl">
            <h2 className="vapi-section-heading text-[clamp(2rem,4vw,2.5rem)]">
              Accurate, multilingual, and built for hotel operations
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((feature, index) => (
              <Reveal key={feature.title} delayMs={index * 70}>
                <article data-gsap-card className="flex h-full flex-col rounded-[5.6px] border border-iron-border bg-carbon-surface p-6 transition-colors hover:border-steel-border">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[5.6px] border border-iron-border bg-slab-elevated">
                    <feature.icon className="h-5 w-5 text-ice-border" strokeWidth={1.5} />
                  </div>
                  <h3 className="mt-5 text-lg font-medium text-cream-text">{feature.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-mute">{feature.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section data-gsap-section className="vapi-hairline py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <Reveal className="max-w-2xl">
            <h2 className="vapi-section-heading text-[clamp(1.75rem,3.5vw,2.25rem)]">
              See the difference at a glance
            </h2>
          </Reveal>

          <Reveal delayMs={80}>
            <div className="mt-10 overflow-hidden rounded-[5.6px] border border-iron-border bg-carbon-surface">
              <div className="grid grid-cols-[1.2fr_repeat(3,minmax(0,1fr))] gap-4 border-b border-iron-border px-4 py-3 font-mono text-xs uppercase tracking-[0.08em] text-zinc-mute max-md:hidden">
                <span>Capability</span>
                <span className="text-cream-text">StayNEP</span>
                <span>Generic chatbot</span>
                <span>Phone tree</span>
              </div>
              {COMPARISON.map((row) => (
                <div
                  key={row.feature}
                  data-gsap-card
                  className="grid grid-cols-1 gap-2 border-t border-iron-border px-4 py-4 text-sm max-md:space-y-2 md:grid-cols-[1.2fr_repeat(3,minmax(0,1fr))] md:items-center md:gap-4"
                >
                  <span className="font-medium text-cream-text">{row.feature}</span>
                  {[row.staynep, row.generic, row.phoneTree].map((value, index) => (
                    <span key={index} className="flex items-center gap-2 max-md:text-xs">
                      <span className="font-mono uppercase tracking-wider text-zinc-mute md:hidden">
                        {index === 0 ? "StayNEP" : index === 1 ? "Generic" : "Phone tree"}
                      </span>
                      {value ? (
                        <>
                          <Check className="h-4 w-4 text-mint-pulse" strokeWidth={2} />
                          <span className={index === 0 ? "text-cream-text" : "text-zinc-mute"}>Included</span>
                        </>
                      ) : (
                        <span className="text-zinc-mute">—</span>
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
      <section id="paths" data-gsap-section className="scroll-mt-24 vapi-hairline py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <Reveal className="max-w-2xl">
            <h2 className="vapi-section-heading text-[clamp(2rem,4vw,2.5rem)]">
              Ship in hours, not weeks
            </h2>
            <p className="mt-5 text-base leading-[1.43] text-zinc-mute">
              Plug the assistant into the flows your guests already use — voice demo, room booking, and concierge handoff from one branded surface.
            </p>
          </Reveal>

          <div className="mt-10 divide-y divide-iron-border rounded-[5.6px] border border-iron-border bg-carbon-surface">
            {SERVICE_LINKS.map((item, index) => (
              <Reveal key={item.title} delayMs={index * 70}>
                <a
                  href={item.href}
                  data-gsap-card
                  {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="group flex items-center justify-between gap-4 px-6 py-5 transition-colors hover:bg-slab-elevated sm:px-8"
                >
                  <div className="flex items-start gap-4">
                    <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-ice-border" strokeWidth={1.5} />
                    <div>
                      <h3 className="text-lg font-medium text-cream-text">{item.title}</h3>
                      <p className="mt-1 text-sm text-zinc-mute">{item.body}</p>
                    </div>
                  </div>
                  {item.external ? (
                    <ExternalLink className="h-4 w-4 shrink-0 text-zinc-mute" strokeWidth={1.5} />
                  ) : (
                    <ArrowRight className="h-4 w-4 shrink-0 text-zinc-mute transition-transform group-hover:translate-x-1" strokeWidth={1.5} />
                  )}
                </a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Platform CTA */}
      <section id="platform" data-gsap-section className="scroll-mt-24 vapi-hairline px-4 py-16 sm:px-6 sm:py-20">
        <Reveal>
          <div data-gsap-card className="mx-auto max-w-[1200px] rounded-[5.6px] border border-iron-border bg-carbon-surface p-6 sm:p-10">
            <div className="flex items-center gap-3">
              <Hotel className="h-5 w-5 text-ice-border" strokeWidth={1.5} />
              <p className="vapi-nav-label">StayNEP platform</p>
            </div>
            <h2 className="vapi-section-heading mt-6 max-w-2xl text-[clamp(1.75rem,3.5vw,2.5rem)]">
              Ready to build with StayNEP?
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-[1.43] text-zinc-mute">
              Configure your hotel brand, policies, and escalation paths in settings. Guests get a polished voice concierge; staff get structured handoffs when automation stops.
            </p>

            <div className="mt-8 grid gap-0 divide-y divide-iron-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              {TRUST_POINTS.map((point) => (
                <div key={point} className="flex items-center gap-3 px-0 py-4 text-sm text-bone-text sm:px-6 first:sm:pl-0">
                  <Check className="h-4 w-4 shrink-0 text-mint-pulse" strokeWidth={2} />
                  {point}
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href="/demo" className="vapi-btn-ember">
                Try voice demo
                <Mic className="h-4 w-4" strokeWidth={2} />
              </Link>
              <a
                href={STAYNEP_SITE}
                target="_blank"
                rel="noopener noreferrer"
                className="vapi-btn-mint"
              >
                View StayNEP
                <ExternalLink className="h-4 w-4" strokeWidth={2} />
              </a>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="vapi-hairline py-10">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="font-semibold text-cream-text">STAYNEP</span>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/admin/login" className="vapi-nav-label text-zinc-mute hover:text-cream-text">
              Admin
            </Link>
            <Link href="/admin/register" className="vapi-nav-label text-zinc-mute hover:text-cream-text">
              Register
            </Link>
            <a
              href={`${STAYNEP_SITE}/contact`}
              target="_blank"
              rel="noopener noreferrer"
              className="vapi-nav-label text-zinc-mute hover:text-cream-text"
            >
              Policies
            </a>
          </div>
          <p className="font-mono text-xs text-zinc-mute">
            © {new Date().getFullYear()} STAYNEP
          </p>
        </div>
      </footer>
    </main>
  );
}
