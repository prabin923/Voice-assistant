"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Building2, Check, MapPin, Mic } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { GsapLandingAnimations } from "@/components/GsapLandingAnimations";
import { SiteShellBackdrop, siteHeaderChrome } from "@/components/SiteShellBackdrop";
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

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Browse",
    body: "Explore all hotels registered on StayNep. Each one has a fully configured voice concierge.",
    icon: Building2,
  },
  {
    step: "02",
    title: "Ask",
    body: "Tap to talk. Ask about rooms, pricing, amenities, or policies — in any language.",
    icon: Mic,
  },
  {
    step: "03",
    title: "Book",
    body: "Reserve directly through the voice assistant. No hold music, no long forms.",
    icon: Check,
  },
];

function HotelCard({ hotel }: { hotel: PublicHotel }) {
  const href = hotel.slug ? `/embed/${hotel.slug}` : "/demo";

  return (
    <article className="flex h-full flex-col rounded-[5.6px] border border-iron-border bg-carbon-surface transition-colors hover:border-steel-border">
      <div
        className="h-1 rounded-t-[5.6px]"
        style={{ background: hotel.accentColor ?? "#e96b34" }}
      />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-medium text-cream-text leading-tight">
              {hotel.hotelName}
            </h3>
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
            <span
              key={a}
              className="rounded border border-iron-border px-2 py-0.5 text-xs text-bone-text/70"
            >
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

  useEffect(() => {
    fetch("/api/hotels")
      .then((r) => r.json())
      .then((d) => setHotels(d.hotels ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-64 animate-pulse rounded-[5.6px] border border-iron-border bg-carbon-surface"
          />
        ))}
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

      {/* Nav */}
      <header data-gsap="nav" className={`sticky top-0 z-50 border-b ${siteHeaderChrome()}`}>
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="text-lg font-semibold tracking-tight text-cream-text">
            STAYNEP
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            {[
              { id: "hotels", label: "Hotels" },
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

      {/* Hero */}
      <section className="relative">
        <div className="mx-auto max-w-[1200px] px-4 pt-16 pb-8 sm:px-6 sm:pt-24 lg:pt-28">
          <div data-gsap="hero-copy" className="mx-auto max-w-3xl text-center">
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

      {/* Hotel listing */}
      <section id="hotels" data-gsap-section className="scroll-mt-24 vapi-hairline py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <Reveal className="max-w-2xl">
            <h2 className="vapi-section-heading text-[clamp(2rem,4vw,2.5rem)]">
              Hotels on StayNep
            </h2>
            <p className="mt-5 text-base leading-[1.43] text-zinc-mute">
              Every hotel below has a voice concierge ready to answer questions and take bookings
              — available 24/7 in 34+ languages.
            </p>
          </Reveal>
          <HotelGrid />
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        data-gsap-section
        className="scroll-mt-24 vapi-hairline py-16 sm:py-20"
      >
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <Reveal className="max-w-2xl">
            <h2 className="vapi-section-heading text-[clamp(2rem,4vw,2.5rem)]">
              Book your stay by voice
            </h2>
            <p className="mt-5 text-base leading-[1.43] text-zinc-mute">
              StayNep connects guests to hotel concierges instantly — no hold music, no long forms.
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

      {/* For Hotels CTA */}
      <section
        id="for-hotels"
        data-gsap-section
        className="scroll-mt-24 vapi-hairline px-4 py-16 sm:px-6 sm:py-20"
      >
        <Reveal>
          <div
            data-gsap-card
            className="mx-auto max-w-[1200px] rounded-[5.6px] border border-iron-border bg-carbon-surface p-6 sm:p-10"
          >
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-ice-border" strokeWidth={1.5} />
              <p className="vapi-nav-label">For hotel owners</p>
            </div>
            <h2 className="vapi-section-heading mt-6 max-w-2xl text-[clamp(1.75rem,3.5vw,2.5rem)]">
              List your hotel on StayNep
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-[1.43] text-zinc-mute">
              Configure your hotel's voice concierge with your brand, room types, policies, and
              FAQs. Guests discover and book with you directly through the StayNep platform.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href="/admin/register" className="vapi-btn-ember">
                Register your hotel
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </Link>
              <Link href="/admin/login" className="vapi-btn-mint">
                Admin login
              </Link>
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
            <Link
              href="/admin/register"
              className="vapi-nav-label text-zinc-mute hover:text-cream-text"
            >
              Register hotel
            </Link>
            <Link href="/staynep-assistant" className="vapi-nav-label text-zinc-mute hover:text-cream-text">
              Voice assistant
            </Link>
          </div>
          <p className="font-mono text-xs text-zinc-mute">
            © {new Date().getFullYear()} STAYNEP
          </p>
        </div>
      </footer>
    </main>
  );
}
