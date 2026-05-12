"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarRange,
  Check,
  Cpu,
  ExternalLink,
  Globe2,
  Headphones,
  Hotel,
  Mic,
  Moon,
  Shield,
  Sun,
} from "lucide-react";
import { StaynepLogo } from "@/components/StaynepLogo";
import { SiteShellBackdrop, siteHeaderChrome } from "@/components/SiteShellBackdrop";
import { Reveal } from "@/components/Reveal";

const STAYNEP_SITE = "https://staynep.com";

const HOTEL_PILLARS = [
  {
    title: "Property operations, one spine",
    body: "Front desk, rooms, and guest touchpoints stay aligned so staff spend less time reconciling tools.",
    icon: Building2,
  },
  {
    title: "Voice receptionist, on-brand",
    body: "Guests speak naturally; responses follow your policies, tone, and escalation paths.",
    icon: Mic,
  },
  {
    title: "Secure admin & analytics",
    body: "Configure the assistant, review interactions, and resolve escalations from a single dashboard.",
    icon: Shield,
  },
];

const LANG_PREVIEW = ["English", "Nepali", "Hindi", "Arabic", "Japanese", "Spanish", "French", "+27 more"];

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
  const muted = isDark ? "text-neutral-400" : "text-neutral-600";
  const border = isDark ? "border-white/10" : "border-neutral-200";
  const cardBase = isDark
    ? "border-white/10 bg-white/[0.04]"
    : "border-neutral-200/90 bg-white/90";

  return (
    <div className={`ac-grid-bg va-noise relative min-h-screen overflow-hidden ${isDark ? "text-neutral-100" : "text-neutral-900"}`}>
      <SiteShellBackdrop isDark={isDark} />

      <div className="relative z-10">
        <header className={`sticky top-0 z-50 border-b backdrop-blur-xl ${siteHeaderChrome(isDark)}`}>
          <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
            <div
              className={`ac-border-beam relative flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-3 py-2 sm:px-4 ${
                isDark ? "border-white/10 bg-black/40" : "border-neutral-200 bg-white/85"
              }`}
            >
              <Link href="/" className="-ml-0.5 flex shrink-0 items-center">
                <StaynepLogo isDark={isDark} size="md" priority />
              </Link>
              <nav
                className={`order-last flex w-full basis-full items-center justify-center gap-1 rounded-xl border px-1.5 py-1 md:order-none md:w-auto md:basis-auto md:justify-start ${
                  isDark ? "border-white/10 bg-white/[0.03]" : "border-neutral-200 bg-white/80"
                }`}
              >
                <a
                  href="#hotel"
                  className={`nav-link-glide rounded-lg px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider sm:px-3 sm:text-sm ${
                    isDark ? "text-neutral-300 hover:text-[#e8c96a]" : "text-neutral-600 hover:text-[#163a5f]"
                  }`}
                >
                  Hotel
                </a>
                <a
                  href="#guest"
                  className={`nav-link-glide rounded-lg px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider sm:px-3 sm:text-sm ${
                    isDark ? "text-neutral-300 hover:text-[#e8c96a]" : "text-neutral-600 hover:text-[#163a5f]"
                  }`}
                >
                  Guest services
                </a>
                <a
                  href="#info"
                  className={`nav-link-glide rounded-lg px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider sm:px-3 sm:text-sm ${
                    isDark ? "text-neutral-300 hover:text-[#e8c96a]" : "text-neutral-600 hover:text-[#163a5f]"
                  }`}
                >
                  Information
                </a>
                <a
                  href="#policies"
                  className={`nav-link-glide rounded-lg px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider sm:px-3 sm:text-sm ${
                    isDark ? "text-neutral-300 hover:text-[#e8c96a]" : "text-neutral-600 hover:text-[#163a5f]"
                  }`}
                >
                  Policies
                </a>
              </nav>
              <div className="flex items-center gap-2">
                <a
                  href={STAYNEP_SITE}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`hidden items-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-semibold transition hover:scale-[1.02] active:scale-95 lg:inline-flex ${
                    isDark ? "glass-chip border-white/10 text-neutral-300 hover:text-white" : "glass-chip border-neutral-200/80 text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  staynep.com
                  <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                </a>
                <button
                  type="button"
                  aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
                  onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl border transition hover:scale-105 active:scale-95 ${
                    isDark ? "glass-chip border-white/12 text-neutral-300 hover:text-white" : "glass-chip border-neutral-200/80 text-neutral-600"
                  }`}
                >
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
                <Link
                  href="/admin/login"
                  className={`hidden rounded-xl border px-3 py-2 text-xs font-semibold transition sm:inline-flex ${
                    isDark ? "glass-chip border-white/10 text-neutral-200 hover:text-white" : "glass-chip border-neutral-200/80 text-neutral-700 hover:text-neutral-950"
                  }`}
                >
                  Admin
                </Link>
                <Link
                  href="/assistant"
                  className="marketing-nav-cta-pop inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#0f2844] via-[#1a456f] to-[#926f18] px-4 py-2 text-sm font-semibold text-white"
                >
                  Voice demo
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Hero — staynep.com-style: clear hierarchy + soft mesh motion */}
        <section className="relative overflow-hidden">
          <div className="sn-landing-mesh" aria-hidden />
          <div className="relative z-[1] mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:pb-24 lg:pt-20">
            <div className="mx-auto max-w-3xl text-center">
              <p
                className={`sn-eyebrow-shine hero-intro hero-intro-delay-1 relative mx-auto mb-5 inline-flex items-center gap-2 overflow-hidden rounded-full border px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] sm:text-[11px] ${
                  isDark ? "border-[#fde047]/35 bg-[#dab52d]/12 text-[#fde047]" : "border-[#163a5f]/28 bg-white text-[#163a5f]"
                }`}
              >
                <Mic className="h-3 w-3 shrink-0" />
                AI voice receptionist
              </p>
              <h1
                className={`hero-intro hero-intro-delay-2 va-display text-balance ${isDark ? "text-[#f8f5eb]" : "text-[#0f2844]"}`}
                style={{ fontSize: "clamp(2rem, 5vw, 3.75rem)", lineHeight: 1.05 }}
              >
                Your hotel&apos;s AI voice receptionist — natural, multilingual, always on.
              </h1>
              <p className={`hero-intro hero-intro-delay-3 mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed sm:text-lg ${muted}`}>
                Guests speak freely; the assistant answers with your policies and brand voice, handles dozens of languages, and escalates to staff when
                needed. Part of the StayNEP ecosystem — try the live demo or explore{" "}
                <a href={STAYNEP_SITE} target="_blank" rel="noopener noreferrer" className="font-semibold underline-offset-4 hover:underline">
                  staynep.com
                </a>{" "}
                for rooms and concierge.
              </p>
              <div className="hero-intro hero-intro-delay-4 mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Link
                  href="/assistant"
                  className="marketing-cta-primary inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0f2844] via-[#1e5278] to-[#9f7b1d] px-8 py-4 text-sm font-semibold text-white"
                >
                  Try voice receptionist
                  <Mic className="h-4 w-4" />
                </Link>
                <a
                  href={`${STAYNEP_SITE}/rooms`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-8 py-4 text-sm font-semibold transition ${isDark ? "glass-chip border-white/18 hover:border-[#fde047]/35" : "glass-chip border-neutral-200/90 hover:border-[#163a5f]/30"}`}
                >
                  Book a room
                  <CalendarRange className="h-4 w-4" />
                </a>
                <a
                  href={`${STAYNEP_SITE}/contact`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-8 py-4 text-sm font-semibold transition ${isDark ? "glass-chip border-white/18 hover:border-[#fde047]/35" : "glass-chip border-neutral-200/90 hover:border-[#163a5f]/30"}`}
                >
                  Concierge
                  <Headphones className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="hero-intro hero-intro-delay-5 mx-auto mt-14 max-w-4xl">
              <div className={`ac-border-beam relative overflow-hidden rounded-[1.75rem] border p-1 ${isDark ? "border-white/[0.12]" : "border-neutral-200/80"}`}>
                <div
                  className={`rounded-[1.45rem] border p-6 sm:p-8 ${isDark ? "border-white/[0.08] bg-[#0a1018]/90" : "border-neutral-200/80 bg-gradient-to-b from-white to-neutral-50"}`}
                >
                  <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-between">
                    <div className="text-center sm:text-left">
                      <p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${isDark ? "text-[#e8c96a]" : "text-[#163a5f]"}`}>Live preview</p>
                      <p className={`mt-2 max-w-sm text-sm leading-relaxed ${muted}`}>
                        Tap the demo to hear the receptionist: silence-aware capture, spoken replies, and the same calm motion as your StayNEP brand
                        surface.
                      </p>
                    </div>
                    <div className="relative flex shrink-0 items-center justify-center">
                      <div className="marketing-ring-pulse-ring absolute h-28 w-28 opacity-60" />
                      <div
                        className={`relative flex h-24 w-24 items-center justify-center rounded-full border-2 ${isDark ? "border-[#fde047]/50 bg-[#163a5f]" : "border-[#163a5f]/40 bg-white"}`}
                      >
                        <Mic className={`h-9 w-9 ${isDark ? "text-[#fff8dc]" : "text-[#163a5f]"}`} />
                      </div>
                    </div>
                    <div className="grid w-full max-w-xs grid-cols-2 gap-3 sm:w-auto">
                      <div className={`rounded-2xl border px-4 py-3 text-center ${cardBase}`}>
                        <p className={`text-2xl font-black tabular-nums ${isDark ? "text-white" : "text-neutral-900"}`}>34+</p>
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${muted}`}>Languages</p>
                      </div>
                      <div className={`rounded-2xl border px-4 py-3 text-center ${cardBase}`}>
                        <p className={`text-2xl font-black tabular-nums ${isDark ? "text-white" : "text-neutral-900"}`}>24/7</p>
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${muted}`}>Voice</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Reveal>
          <section
            id="hotel"
            className={`scroll-mt-24 border-y py-14 backdrop-blur-xl sm:py-16 ${border} ${isDark ? "bg-black/25" : "bg-white/60"}`}
          >
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <div className="max-w-2xl">
                <p className={`text-xs font-bold uppercase tracking-[0.2em] ${isDark ? "text-[#e8c96a]" : "text-[#163a5f]"}`}>Hotel</p>
                <h2 className={`va-display mt-2 text-3xl sm:text-4xl ${isDark ? "text-white" : "text-neutral-900"}`}>Operations that stay in sync</h2>
                <p className={`mt-3 text-sm leading-relaxed sm:text-base ${muted}`}>
                  StayNEP is built for Nepali hotels and growing chains — this voice assistant module plugs into that story with the same navy and gold
                  system you see across the brand.
                </p>
              </div>
              <div className="mt-10 grid gap-4 md:grid-cols-3">
                {HOTEL_PILLARS.map((item, i) => (
                  <Reveal key={item.title} delayMs={i * 70}>
                    <article
                      className={`sn-service-card h-full rounded-2xl border p-5 sm:p-6 ${isDark ? "border-white/10 bg-[#0d1622]/80" : "border-neutral-200 bg-white"}`}
                    >
                      <div
                        className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border ${isDark ? "border-white/12 bg-white/[0.04]" : "border-neutral-200 bg-neutral-50"}`}
                      >
                        <item.icon className={`h-5 w-5 ${isDark ? "text-[#f4edd8]" : "text-[#163a5f]"}`} />
                      </div>
                      <h3 className={`text-lg font-semibold ${isDark ? "text-white" : "text-neutral-900"}`}>{item.title}</h3>
                      <p className={`mt-2 text-sm leading-relaxed ${muted}`}>{item.body}</p>
                    </article>
                  </Reveal>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/admin/register"
                  className={`inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold ${isDark ? "border-white/15 hover:border-[#fde047]/40" : "border-neutral-300 hover:border-[#163a5f]/35"}`}
                >
                  Register hotel
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/admin/login"
                  className={`inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold ${isDark ? "border-white/15 hover:border-[#fde047]/40" : "border-neutral-300 hover:border-[#163a5f]/35"}`}
                >
                  Sign in
                </Link>
              </div>
            </div>
          </section>
        </Reveal>

        <section id="guest" className="scroll-mt-24 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="max-w-2xl">
              <p className={`text-xs font-bold uppercase tracking-[0.2em] ${isDark ? "text-[#e8c96a]" : "text-[#163a5f]"}`}>Guest services</p>
              <h2 className={`va-display mt-2 text-3xl sm:text-4xl ${isDark ? "text-white" : "text-neutral-900"}`}>Everything a guest expects online</h2>
              <p className={`mt-3 text-sm sm:text-base ${muted}`}>Mirrors the primary journeys published on staynep.com — book, talk, and get help.</p>
            </Reveal>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                {
                  title: "Book a room",
                  body: "Browse availability and reserve directly on StayNEP.",
                  href: `${STAYNEP_SITE}/rooms`,
                  external: true,
                  icon: CalendarRange,
                },
                {
                  title: "Concierge",
                  body: "Reach the team for special requests, transfers, and on-property help.",
                  href: `${STAYNEP_SITE}/contact`,
                  external: true,
                  icon: Headphones,
                },
                {
                  title: "Voice receptionist",
                  body: "Open the multilingual demo tuned for hospitality tone and escalation.",
                  href: "/assistant",
                  external: false,
                  icon: Mic,
                },
              ].map((c, i) => (
                <Reveal key={c.title} delayMs={i * 80}>
                  <a
                    href={c.href}
                    {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className={`sn-service-card group flex h-full flex-col rounded-2xl border p-6 transition-colors ${isDark ? "border-white/10 bg-[#0d1622]/75 hover:border-[#e8c96a]/30" : "border-neutral-200 bg-white hover:border-[#6ea4c7]/45"}`}
                  >
                    <c.icon className={`h-8 w-8 ${isDark ? "text-[#e8c96a]" : "text-[#163a5f]"}`} />
                    <h3 className={`mt-4 text-lg font-semibold ${isDark ? "text-white" : "text-neutral-900"}`}>{c.title}</h3>
                    <p className={`mt-2 flex-1 text-sm leading-relaxed ${muted}`}>{c.body}</p>
                    <span className={`mt-5 inline-flex items-center gap-1.5 text-sm font-semibold ${isDark ? "text-[#fde047]" : "text-[#163a5f]"}`}>
                      {c.external ? (
                        <>
                          Open
                          <ExternalLink className="h-4 w-4 opacity-80 transition group-hover:translate-x-0.5" />
                        </>
                      ) : (
                        <>
                          Launch
                          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                        </>
                      )}
                    </span>
                  </a>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="info" className="scroll-mt-24 pb-16 sm:pb-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal>
              <div className={`ac-border-beam glass-panel rounded-3xl border p-8 sm:p-10 ${isDark ? "border-white/10" : "border-neutral-200/80"}`}>
                <div className="grid gap-8 lg:grid-cols-[1fr_1.05fr] lg:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <Cpu className="h-9 w-9 text-[#163a5f] dark:text-[#e4c449]" />
                      <p className={`text-xs font-bold uppercase tracking-[0.2em] ${isDark ? "text-[#e8c96a]" : "text-[#163a5f]"}`}>Information</p>
                    </div>
                    <h2 className={`va-display mt-3 text-3xl sm:text-4xl ${isDark ? "text-white" : "text-neutral-900"}`}>Built for Nepal&apos;s hospitality stack</h2>
                    <p className={`mt-4 text-sm leading-relaxed sm:text-base ${muted}`}>
                      StayNEP positions itself as full hotel management software. This repository showcases the voice receptionist experience — Gemini-powered
                      speech, policy-aware replies, and staff escalation — styled to match the StayNEP brand you see on the public site.
                    </p>
                    <ul className="mt-6 space-y-2.5">
                      {["Multilingual guest conversations", "Admin configuration & analytics", "Rate-limited, CSRF-aware auth"].map((line) => (
                        <li key={line} className="flex items-center gap-2 text-sm font-medium">
                          <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                          <span className={isDark ? "text-neutral-300" : "text-neutral-700"}>{line}</span>
                        </li>
                      ))}
                    </ul>
                    <a
                      href={STAYNEP_SITE}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`mt-6 inline-flex items-center gap-2 text-sm font-semibold underline-offset-4 hover:underline ${isDark ? "text-[#fde047]" : "text-[#163a5f]"}`}
                    >
                      Visit staynep.com
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                  <div className={`rounded-2xl border p-6 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-neutral-200 bg-white/90"}`}>
                    <div className="flex items-center gap-2">
                      <Globe2 className="h-6 w-6 text-[#163a5f] dark:text-[#e4c449]" />
                      <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-[#e8c96a]" : "text-[#163a5f]"}`}>Languages in the demo</p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {LANG_PREVIEW.map((lang) => (
                        <span
                          key={lang}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${isDark ? "border-white/12 bg-white/[0.06] text-neutral-200" : "border-neutral-200 bg-neutral-50 text-neutral-700"}`}
                        >
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20">
          <Reveal delayMs={40}>
            <div className="ac-border-beam relative overflow-hidden rounded-3xl border border-[#163a5f]/35 bg-[#163a5f]/10 p-[1px]">
              <div className="relative overflow-hidden rounded-[calc(1.5rem-1px)] bg-gradient-to-br from-[#0f2844] via-[#163a5f] to-[#9a7614] p-6 sm:p-10">
                <div className="marketing-hero-scan pointer-events-none absolute left-1/2 top-1/2 h-[min(860px,140vw)] w-[min(860px,140vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[conic-gradient(from_185deg,rgba(250,204,21,0.82),transparent_28%,rgba(42,94,148,0.72)_48%,transparent_62%,rgba(232,212,73,0.92)_82%,transparent)] blur-[92px]" aria-hidden />
                <div className="relative grid items-center gap-6 lg:grid-cols-[1fr_auto]">
                  <div>
                    <h2 className="va-display text-white" style={{ fontSize: "clamp(1.75rem, 4.2vw, 3rem)", lineHeight: 1.05 } as CSSProperties}>
                      Hear the StayNEP voice layer today
                    </h2>
                    <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
                      Same visual language as the main site — navy depth, gold highlights, and motion that stays subtle on phones.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:min-w-[240px]">
                    <Link
                      href="/assistant"
                      className="marketing-badge-pulse inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-[#163a5f]"
                    >
                      Open voice demo
                      <Mic className="h-5 w-5" />
                    </Link>
                    <Link
                      href="/admin/register"
                      className="inline-flex w-full items-center justify-center rounded-xl border border-white/45 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white"
                    >
                      Register your hotel
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        <footer id="policies" className={`scroll-mt-24 border-t py-14 backdrop-blur-xl ${border} ${isDark ? "bg-black/35" : "bg-neutral-50/90"}`}>
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
            <div className="lg:col-span-1">
              <StaynepLogo isDark={isDark} size="lg" className="max-w-[200px]" />
              <p className={`mt-4 max-w-xs text-sm ${muted}`}>StayNEP — full hotel management software. Voice receptionist demo for modern guest experiences.</p>
            </div>
            <div>
              <p className={`text-xs font-bold uppercase tracking-wider ${muted}`}>Hotel</p>
              <ul className="mt-4 space-y-2 text-sm">
                <li>
                  <Link href="/admin/register" className="sn-footer-link font-medium hover:text-yellow-700 dark:hover:text-[#e4c449]">
                    Register
                  </Link>
                </li>
                <li>
                  <Link href="/admin/login" className="sn-footer-link font-medium hover:text-yellow-700 dark:hover:text-[#e4c449]">
                    Admin login
                  </Link>
                </li>
                <li>
                  <Link href="/settings" className="sn-footer-link font-medium hover:text-yellow-700 dark:hover:text-[#e4c449]">
                    Configuration
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className={`text-xs font-bold uppercase tracking-wider ${muted}`}>Guest services</p>
              <ul className="mt-4 space-y-2 text-sm">
                <li>
                  <a href={`${STAYNEP_SITE}/rooms`} target="_blank" rel="noopener noreferrer" className="sn-footer-link inline-flex items-center gap-1 font-medium hover:text-yellow-700 dark:hover:text-[#e4c449]">
                    Book a room <ExternalLink className="h-3 w-3 opacity-60" />
                  </a>
                </li>
                <li>
                  <a href={`${STAYNEP_SITE}/contact`} target="_blank" rel="noopener noreferrer" className="sn-footer-link inline-flex items-center gap-1 font-medium hover:text-yellow-700 dark:hover:text-[#e4c449]">
                    Concierge <ExternalLink className="h-3 w-3 opacity-60" />
                  </a>
                </li>
                <li>
                  <Link href="/assistant" className="sn-footer-link font-medium hover:text-yellow-700 dark:hover:text-[#e4c449]">
                    Voice receptionist
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className={`text-xs font-bold uppercase tracking-wider ${muted}`}>Policies</p>
              <ul className="mt-4 space-y-2 text-sm">
                {[
                  { label: "Privacy Policy", href: `${STAYNEP_SITE}/contact` },
                  { label: "Terms of Service", href: `${STAYNEP_SITE}/contact` },
                  { label: "Cancellation Policy", href: `${STAYNEP_SITE}/contact` },
                  { label: "House Rules", href: `${STAYNEP_SITE}/contact` },
                ].map((p) => (
                  <li key={p.label}>
                    <a href={p.href} target="_blank" rel="noopener noreferrer" className="sn-footer-link inline-flex items-center gap-1 text-neutral-600 hover:text-yellow-700 dark:text-neutral-400 dark:hover:text-[#e4c449]">
                      {p.label}
                      <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className={`mx-auto mt-12 max-w-6xl px-4 text-center text-xs sm:px-6 ${muted}`}>
            © {new Date().getFullYear()} STAYNEP. All rights reserved. · Voice assistant module
          </p>
        </footer>
      </div>
    </div>
  );
}
