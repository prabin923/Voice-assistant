"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Check,
  MapPin,
  Mic,
  Volume2,
  Globe2,
  Zap,
  Shield,
  MessageSquare,
  PhoneCall,
  Star,
  Code2,
  Layers,
  Clock,
  Languages,
  BrainCircuit,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import dynamic from "next/dynamic";
import { Reveal } from "@/components/Reveal";
import { SiteShellBackdrop, siteHeaderChrome } from "@/components/SiteShellBackdrop";

const GsapLandingAnimations = dynamic(
  () => import("@/components/GsapLandingAnimations").then((m) => m.GsapLandingAnimations),
  { ssr: false }
);
import { SpectrogramWaveform } from "@/components/SpectrogramWaveform";

type PublicHotel = {
  id: string;
  slug: string;
  hotelName: string;
  tagline: string | null;
  accentColor: string | null;
  city: string | null;
  country: string | null;
  roomCount: number;
  startingPrice: number | null;
  currency: string;
  amenities: string[];
};

const STATS = [
  { value: "40+", label: "Languages" },
  { value: "24/7", label: "Available" },
  { value: "<1s", label: "Response time" },
  { value: "100%", label: "Voice powered" },
];

const GUEST_FEATURES = [
  {
    icon: Mic,
    title: "Talk naturally",
    body: "Ask questions the way you'd ask a real concierge — no scripts, no menus. The AI understands context across the whole conversation.",
  },
  {
    icon: Globe2,
    title: "40+ languages",
    body: "Speak in your native language. The concierge understands and responds in English, Nepali, Hindi, Arabic, Chinese, French, and dozens more.",
  },
  {
    icon: MessageSquare,
    title: "Voice or text",
    body: "Prefer typing? Switch to Chat mode at any time. The same AI powers both — no change in quality or features.",
  },
  {
    icon: BrainCircuit,
    title: "Context aware",
    body: "The concierge remembers what you said earlier in the conversation. No need to repeat yourself.",
  },
  {
    icon: Clock,
    title: "Instant answers",
    body: "Responses stream in under a second. Powered by Gemini with neural TTS — the voice sounds natural, not robotic.",
  },
  {
    icon: PhoneCall,
    title: "Telephony mode",
    body: "Want a more immersive experience? Switch to a full voice call with the hotel concierge — hands-free, natural conversation.",
  },
];

const HOTEL_FEATURES = [
  {
    icon: Layers,
    title: "Fully branded",
    body: "Your hotel name, logo, and accent color — the concierge feels like yours. Guests see your brand, not ours.",
  },
  {
    icon: Code2,
    title: "Embeddable anywhere",
    body: "One embed link. Drop the voice concierge into your website, booking portal, or QR code at the front desk.",
  },
  {
    icon: BrainCircuit,
    title: "Knows your hotel",
    body: "Configure rooms, rates, policies, dining options, amenities, and FAQs. The AI answers from your data only — no hallucinations.",
  },
  {
    icon: Star,
    title: "Guest loyalty",
    body: "Guests can log in to see their booking history, loyalty tier, and manage their stay — all through the same voice interface.",
  },
  {
    icon: Zap,
    title: "Booking pipeline",
    body: "The concierge collects check-in, check-out, and guest details, then shows a booking summary card before confirming.",
  },
  {
    icon: Shield,
    title: "Staff escalation",
    body: "When a guest needs a real human, the concierge hands off gracefully to your team — with full conversation context.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Browse",
    body: "Explore all hotels registered on StayNep. Each one has a fully configured voice concierge — ready to answer questions about rooms, pricing, and policies.",
    icon: Building2,
  },
  {
    step: "02",
    title: "Ask",
    body: "Tap the orb to start talking. Ask about availability, request a room comparison, or ask about the spa — in any language, with no hold music.",
    icon: Mic,
  },
  {
    step: "03",
    title: "Book",
    body: "When you're ready, the concierge walks you through the booking. Check the summary card, confirm, and you're done — entirely by voice.",
    icon: Check,
  },
];

const VOICE_CAPABILITIES = [
  "Real-time voice activity detection — submits when you pause speaking",
  "Neural TTS (Nemotron) with browser speech fallback",
  "Whisper & Gemini STT with automatic quality fallback",
  "Silence threshold auto-tuning per session",
  "Auto-switches to server STT for languages with poor browser support (Nepali, Arabic, etc.)",
  "Streams AI response tokens while TTS pre-fetches audio",
  "Resume-listen after assistant speaks — conversation flows naturally",
  "Telephony mode: full duplex voice call via Telnyx",
];

function HotelCard({ hotel }: { hotel: PublicHotel }) {
  const href = hotel.slug ? `/embed/${hotel.slug}` : "/demo";

  return (
    <article className="flex h-full flex-col rounded-[5.6px] border border-iron-border bg-carbon-surface transition-colors hover:border-steel-border">
      <div className="h-1 rounded-t-[5.6px]" style={{ background: hotel.accentColor ?? "#e96b34" }} />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-medium text-cream-text leading-tight">{hotel.hotelName}</h3>
            {(hotel.city || hotel.country) && (
              <p className="mt-1 flex items-center gap-1 text-xs text-zinc-mute">
                <MapPin className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                {[hotel.city, hotel.country].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
          {hotel.startingPrice != null && (
            <div className="shrink-0 text-right">
              <p className="text-xs text-zinc-mute">from</p>
              <p className="text-lg font-semibold text-cream-text">
                {hotel.startingPrice}{" "}
                <span className="text-sm font-normal text-zinc-mute">{hotel.currency}</span>
              </p>
              <p className="text-xs text-zinc-mute">/night</p>
            </div>
          )}
        </div>

        {hotel.tagline && (
          <p className="mt-3 text-sm leading-relaxed text-zinc-mute">{hotel.tagline}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {hotel.amenities.slice(0, 3).map((a) => (
            <span key={a} className="rounded border border-iron-border px-2 py-0.5 text-xs text-bone-text/70">
              {a}
            </span>
          ))}
          {hotel.roomCount > 0 && (
            <span className="rounded border border-iron-border px-2 py-0.5 text-xs text-bone-text/70">
              {hotel.roomCount} room {hotel.roomCount === 1 ? "type" : "types"}
            </span>
          )}
        </div>

        <div className="mt-auto pt-4">
          <Link href={href} className="vapi-btn-ember vapi-btn-compact w-full justify-center">
            <Mic className="h-3.5 w-3.5" strokeWidth={2} />
            Talk to concierge
          </Link>
        </div>
      </div>
    </article>
  );
}

function HotelGrid() {
  const [hotels, setHotels] = useState<PublicHotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    fetch("/api/hotels")
      .then((r) => r.json())
      .then((d) => setHotels(d.hotels ?? []))
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-64 animate-pulse rounded-[5.6px] border border-iron-border bg-carbon-surface" />
        ))}
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="mt-12 rounded-[5.6px] border border-iron-border bg-carbon-surface p-10 text-center">
        <Building2 className="mx-auto h-8 w-8 text-zinc-mute" strokeWidth={1.5} />
        <p className="mt-4 text-zinc-mute">Couldn't load hotels — check your connection and try again.</p>
        <button
          type="button"
          onClick={() => { setFetchError(false); setLoading(true); fetch("/api/hotels").then((r) => r.json()).then((d) => setHotels(d.hotels ?? [])).catch(() => setFetchError(true)).finally(() => setLoading(false)); }}
          className="vapi-btn-ember mt-6 inline-flex"
        >
          Retry
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
    );
  }

  if (hotels.length === 0) {
    return (
      <div className="mt-12 rounded-[5.6px] border border-iron-border bg-carbon-surface p-10 text-center">
        <Building2 className="mx-auto h-8 w-8 text-zinc-mute" strokeWidth={1.5} />
        <p className="mt-4 text-zinc-mute">No hotels listed yet. Be the first!</p>
        <Link href="/admin/register" className="vapi-btn-ember mt-6 inline-flex">
          Register your hotel
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {hotels.map((hotel, index) => (
        <Reveal key={hotel.id} delayMs={index * 70}>
          <HotelCard hotel={hotel} />
        </Reveal>
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-void-canvas text-cream-text">
      <GsapLandingAnimations />
      <SiteShellBackdrop />

      {/* ── Nav ── */}
      <header data-gsap="nav" className={`sticky top-0 z-50 border-b ${siteHeaderChrome()}`}>
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="text-lg font-semibold tracking-tight text-cream-text">
            STAYNEP
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            {[
              { id: "hotels", label: "Hotels" },
              { id: "features", label: "Features" },
              { id: "how-it-works", label: "How it works" },
              { id: "for-hotels", label: "For Hotels" },
            ].map((item) => (
              <a key={item.id} href={`#${item.id}`} className="vapi-nav-label">
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/staynep-assistant" className="vapi-btn-ember vapi-btn-compact">
              Try assistant
              <Mic className="h-3.5 w-3.5" strokeWidth={2} />
            </Link>
            <Link href="/admin/login" className="vapi-btn-mint vapi-btn-compact hidden sm:inline-flex">
              Hotel login
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative">
        <div className="mx-auto max-w-[1200px] px-4 pt-16 pb-8 sm:px-6 sm:pt-24 lg:pt-28">
          <div data-gsap="hero-copy" className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-iron-border bg-carbon-surface px-3.5 py-1.5 text-[12px] text-zinc-mute">
              <Sparkles className="h-3.5 w-3.5 text-ember-orange" strokeWidth={2} />
              Powered by staynep · Neural TTS · 40+ languages
            </div>

            <h1 className="vapi-headline text-balance text-[clamp(2.5rem,6vw,4.25rem)]">
              Your voice concierge
              <br />
              for every hotel
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-[1.43] text-bone-text">
              Browse hotels on StayNep and talk directly to their AI concierge — ask about rooms,
              availability, and policies, or book your stay entirely by voice.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a href="#hotels" className="vapi-btn-ember">
                Browse hotels
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
              </a>
              <Link href="/staynep-assistant" className="vapi-btn-mint">
                <Mic className="h-4 w-4" strokeWidth={2} />
                Try voice assistant
              </Link>
            </div>

            <div className="mt-12 flex justify-center">
              <Link href="/staynep-assistant" data-gsap="talk-console" className="vapi-talk-console">
                Ask StayNep
                <span className="grid grid-cols-2 gap-0.5">
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className="h-1 w-1 rounded-full bg-void-canvas" />
                  ))}
                </span>
              </Link>
            </div>
          </div>
        </div>

        <SpectrogramWaveform className="mt-8 sm:mt-12" />
      </section>

      {/* ── Stats bar ── */}
      <section className="vapi-hairline border-b border-iron-border">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <div className="grid grid-cols-2 divide-x divide-iron-border sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-1 py-8">
                <span className="text-2xl font-bold text-cream-text sm:text-3xl">{s.value}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-mute">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Hotel listing ── */}
      <section id="hotels" data-gsap-section className="scroll-mt-24 vapi-hairline py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <Reveal className="max-w-2xl">
            <h2 className="vapi-section-heading text-[clamp(2rem,4vw,2.5rem)]">
              Hotels on StayNep
            </h2>
            <p className="mt-5 text-base leading-[1.43] text-zinc-mute">
              Every hotel below has a voice concierge ready to answer questions and take bookings
              — available 24/7 in 40+ languages. Tap the orb and start talking.
            </p>
          </Reveal>
          <HotelGrid />
        </div>
      </section>

      {/* ── Platform assistant callout ── */}
      <section className="vapi-hairline py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <Reveal>
            <div className="overflow-hidden rounded-[5.6px] border border-iron-border bg-carbon-surface">
              <div className="grid gap-0 lg:grid-cols-2">
                {/* Left */}
                <div className="flex flex-col justify-center p-8 sm:p-10 lg:p-12">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-[5.6px] border border-iron-border bg-slab-elevated">
                      <Mic className="h-4 w-4 text-ember-orange" strokeWidth={1.5} />
                    </div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-mute">
                      StayNep Assistant
                    </p>
                  </div>
                  <h2 className="vapi-section-heading text-[clamp(1.75rem,3vw,2.25rem)]">
                    Not sure which hotel?
                    <br />
                    Just ask StayNep.
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-zinc-mute">
                    The StayNep platform assistant knows every registered hotel — rooms, prices,
                    amenities, and policies. Ask it to compare hotels, filter by budget, or find a
                    place with a pool in your city.
                  </p>
                  <ul className="mt-6 space-y-2.5">
                    {[
                      "Compare hotels side-by-side",
                      "Filter by price, location, or amenity",
                      "Ask follow-up questions naturally",
                      "Voice and text — your choice",
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2.5 text-sm text-bone-text">
                        <Check className="h-4 w-4 shrink-0 text-mint-pulse" strokeWidth={2.5} />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8">
                    <Link href="/staynep-assistant" className="vapi-btn-ember inline-flex">
                      <Mic className="h-4 w-4" strokeWidth={2} />
                      Open platform assistant
                    </Link>
                  </div>
                </div>

                {/* Right — mock UI */}
                <div className="flex items-center justify-center border-t border-iron-border bg-slab-elevated p-8 lg:border-l lg:border-t-0">
                  <div className="w-full max-w-xs space-y-3">
                    {[
                      { role: "user", text: "Which hotels have a rooftop pool?" },
                      { role: "assistant", text: "The Aurelian Grand has a rooftop infinity pool on the 12th floor with city views. Want me to tell you more, or compare it with nearby options?" },
                      { role: "user", text: "What's the starting price?" },
                    ].map((msg, i) => (
                      <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                        <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                          msg.role === "user"
                            ? "rounded-tr-sm bg-white/[0.08] text-neutral-100 border border-white/10"
                            : "rounded-tl-sm bg-ember-orange/10 text-neutral-100 border border-ember-orange/20"
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 pt-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ember-orange/30 bg-ember-orange/10">
                        <Mic className="h-3.5 w-3.5 text-ember-orange" strokeWidth={2} />
                      </div>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                        <div className="h-full w-2/3 rounded-full bg-ember-orange/40 animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" data-gsap-section className="scroll-mt-24 vapi-hairline py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <Reveal className="max-w-2xl">
            <h2 className="vapi-section-heading text-[clamp(2rem,4vw,2.5rem)]">
              Book your stay by voice
            </h2>
            <p className="mt-5 text-base leading-[1.43] text-zinc-mute">
              StayNep connects guests to hotel concierges instantly — no hold music, no long forms,
              no call centres.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {HOW_IT_WORKS.map((step, index) => (
              <Reveal key={step.title} delayMs={index * 70}>
                <article
                  data-gsap-card
                  className="flex h-full flex-col rounded-[5.6px] border border-iron-border bg-carbon-surface p-6 transition-colors hover:border-steel-border"
                >
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
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Guest features ── */}
      <section id="features" data-gsap-section className="scroll-mt-24 vapi-hairline py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <Reveal className="max-w-2xl">
            <p className="vapi-nav-label mb-3 text-mint-pulse">For guests</p>
            <h2 className="vapi-section-heading text-[clamp(2rem,4vw,2.5rem)]">
              Everything you'd ask
              <br />
              a real concierge
            </h2>
            <p className="mt-5 text-base leading-[1.43] text-zinc-mute">
              Each hotel's AI concierge is trained on their specific rooms, policies, dining, and
              amenities. You get real answers, not generic filler.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GUEST_FEATURES.map((f, i) => (
              <Reveal key={f.title} delayMs={i * 50}>
                <div className="flex h-full flex-col gap-3 rounded-[5.6px] border border-iron-border bg-carbon-surface p-5 transition-colors hover:border-steel-border">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[5.6px] border border-iron-border bg-slab-elevated">
                    <f.icon className="h-4.5 w-4.5 h-[18px] w-[18px] text-ice-border" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-sm font-semibold text-cream-text">{f.title}</h3>
                  <p className="text-[13px] leading-relaxed text-zinc-mute">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Embedded concierge section ── */}
      <section className="vapi-hairline py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <Reveal>
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
              {/* Left — description */}
              <div>
                <p className="vapi-nav-label mb-3 text-ember-orange">Embedded concierge</p>
                <h2 className="vapi-section-heading text-[clamp(1.75rem,3.5vw,2.5rem)]">
                  Every hotel page has
                  <br />
                  a voice concierge built in
                </h2>
                <p className="mt-5 text-base leading-relaxed text-zinc-mute">
                  When you visit a hotel's page on StayNep — or scan their QR code — you land
                  directly in a full-screen voice assistant configured for that property. No
                  downloads, no sign-ups.
                </p>

                <div className="mt-8 space-y-4">
                  {[
                    {
                      icon: Volume2,
                      title: "Glass orb interface",
                      body: "Tap the animated orb to start. Ripple rings pulse while the concierge listens; a speaking animation plays when it responds.",
                    },
                    {
                      icon: Languages,
                      title: "Auto language detection",
                      body: "For languages with poor browser STT support (Nepali, Arabic, etc.) it automatically switches to Whisper or Gemini server-side transcription.",
                    },
                    {
                      icon: Zap,
                      title: "Streaming responses",
                      body: "Text streams token by token while the neural voice is pre-fetched in parallel — so the response feels instant, not queued.",
                    },
                  ].map((item) => (
                    <div key={item.title} className="flex gap-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[5.6px] border border-iron-border bg-slab-elevated">
                        <item.icon className="h-4 w-4 text-ice-border" strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-cream-text">{item.title}</p>
                        <p className="mt-0.5 text-[13px] leading-relaxed text-zinc-mute">{item.body}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8">
                  <a href="#hotels" className="inline-flex items-center gap-1.5 text-sm font-medium text-ember-orange hover:text-ember-orange/80 transition-colors">
                    See hotels with embedded concierge
                    <ChevronRight className="h-4 w-4" strokeWidth={2} />
                  </a>
                </div>
              </div>

              {/* Right — capabilities list */}
              <div className="rounded-[5.6px] border border-iron-border bg-carbon-surface p-6">
                <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-mute">
                  Voice pipeline capabilities
                </p>
                <ul className="space-y-3">
                  {VOICE_CAPABILITIES.map((cap) => (
                    <li key={cap} className="flex items-start gap-3 text-[13px] leading-relaxed text-bone-text">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint-pulse" strokeWidth={2.5} />
                      {cap}
                    </li>
                  ))}
                </ul>

                <div className="mt-6 border-t border-iron-border pt-5">
                  <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-mute">
                    What guests can ask
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Room availability",
                      "Pricing & rates",
                      "Check-in time",
                      "Pool & spa",
                      "Restaurant hours",
                      "Cancellation policy",
                      "Airport transfer",
                      "Pet policy",
                      "Make a booking",
                      "Dining reservation",
                    ].map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full border border-iron-border bg-slab-elevated px-2.5 py-1 text-[11px] text-bone-text/70"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── For Hotels ── */}
      <section id="for-hotels" data-gsap-section className="scroll-mt-24 vapi-hairline py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <Reveal className="max-w-2xl">
            <p className="vapi-nav-label mb-3 text-ice-border">For hotel owners</p>
            <h2 className="vapi-section-heading text-[clamp(2rem,4vw,2.5rem)]">
              Give your hotel a voice
            </h2>
            <p className="mt-5 text-base leading-[1.43] text-zinc-mute">
              Set up your concierge in minutes. Configure everything through a simple admin
              dashboard — no code needed. Guests can start talking from day one.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {HOTEL_FEATURES.map((f, i) => (
              <Reveal key={f.title} delayMs={i * 50}>
                <div className="flex h-full flex-col gap-3 rounded-[5.6px] border border-iron-border bg-carbon-surface p-5 transition-colors hover:border-steel-border">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[5.6px] border border-iron-border bg-slab-elevated">
                    <f.icon className="h-[18px] w-[18px] text-ice-border" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-sm font-semibold text-cream-text">{f.title}</h3>
                  <p className="text-[13px] leading-relaxed text-zinc-mute">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div className="mt-8 rounded-[5.6px] border border-iron-border bg-carbon-surface p-6 sm:p-10">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-cream-text">
                    Ready to list your hotel?
                  </h3>
                  <p className="mt-2 text-sm text-zinc-mute">
                    Register in under 5 minutes. Configure rooms, policies, and branding from the
                    admin dashboard.
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
                  <Link href="/admin/register" className="vapi-btn-ember">
                    Register your hotel
                    <ArrowRight className="h-4 w-4" strokeWidth={2} />
                  </Link>
                  <Link href="/admin/login" className="vapi-btn-mint">
                    Admin login
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="vapi-hairline py-10">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="font-semibold text-cream-text">STAYNEP</span>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <a href="#hotels" className="vapi-nav-label text-zinc-mute hover:text-cream-text">Hotels</a>
            <a href="#features" className="vapi-nav-label text-zinc-mute hover:text-cream-text">Features</a>
            <a href="#how-it-works" className="vapi-nav-label text-zinc-mute hover:text-cream-text">How it works</a>
            <Link href="/staynep-assistant" className="vapi-nav-label text-zinc-mute hover:text-cream-text">Voice assistant</Link>
            <Link href="/admin/register" className="vapi-nav-label text-zinc-mute hover:text-cream-text">Register hotel</Link>
            <Link href="/admin/login" className="vapi-nav-label text-zinc-mute hover:text-cream-text">Admin</Link>
          </div>
          <p className="font-mono text-xs text-zinc-mute">
            © {new Date().getFullYear()} STAYNEP
          </p>
        </div>
      </footer>
    </main>
  );
}
