"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Hotel, Loader2, Mic, UserRound } from "lucide-react";
import { SiteShellBackdrop, siteHeaderChrome } from "@/components/SiteShellBackdrop";
import { GuestAuthPanel, loadGuestProfile } from "@/components/GuestAuthPanel";
import type { GuestProfile } from "@/lib/clientGuestAuth";

export default function DemoPage() {
  const router = useRouter();
  const [loadingHotel, setLoadingHotel] = useState(false);
  const [loadingGuest, setLoadingGuest] = useState(false);
  const [showGuestAuth, setShowGuestAuth] = useState(false);
  const [guestProfile, setGuestProfile] = useState<GuestProfile | null>(null);

  useEffect(() => {
    void fetch("/api/auth/csrf", { credentials: "include" });
  }, []);

  function goToAssistant() {
    router.push("/assistant");
  }

  async function chooseGuest() {
    setLoadingGuest(true);
    try {
      const profile = await loadGuestProfile();
      if (profile) {
        setGuestProfile(profile);
        goToAssistant();
        return;
      }
      setShowGuestAuth(true);
    } finally {
      setLoadingGuest(false);
    }
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
    <main className="relative min-h-screen overflow-x-hidden bg-void-canvas text-cream-text">
      <SiteShellBackdrop />

      <header className={`sticky top-0 z-20 border-b ${siteHeaderChrome()}`}>
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-4 sm:px-6">
          <Link href="/" className="vapi-nav-label inline-flex items-center gap-2 text-zinc-mute hover:text-cream-text">
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            Home
          </Link>
          <span className="text-lg font-semibold tracking-tight">STAYNEP</span>
          <Link href="/admin/login" className="vapi-btn-mint vapi-btn-compact hidden sm:inline-flex">
            Sign in
          </Link>
        </div>
      </header>

      <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-[1200px] flex-col items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-lg rounded-[5.6px] border border-iron-border bg-carbon-surface p-6 sm:p-8">
          <p className="vapi-nav-label text-zinc-mute">Request a demo</p>
          <h1 className="vapi-headline mt-4 text-balance text-[clamp(1.75rem,4vw,2.25rem)]">
            Who is trying the demo?
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-mute">
            Guests try the voice assistant. Hotels sign in to manage their receptionist settings.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void chooseGuest()}
              disabled={loadingHotel || loadingGuest}
              className="group rounded-[5.6px] border border-iron-border bg-slab-elevated p-5 text-left transition-colors hover:border-steel-border disabled:opacity-50"
            >
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-[5.6px] border border-iron-border bg-carbon-surface text-ice-border">
                {loadingGuest ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserRound className="h-5 w-5" strokeWidth={1.5} />}
              </div>
              <h2 className="text-base font-medium text-cream-text">Guest / user</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-mute">Try the multilingual voice receptionist.</p>
              <span className="mt-4 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-mint-pulse">
                Open assistant
                <Mic className="h-3.5 w-3.5" strokeWidth={1.5} />
              </span>
            </button>

            <button
              type="button"
              onClick={chooseHotel}
              disabled={loadingHotel}
              className="group rounded-[5.6px] border border-iron-border bg-slab-elevated p-5 text-left transition-colors hover:border-steel-border disabled:opacity-50"
            >
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-[5.6px] border border-iron-border bg-carbon-surface text-ice-border">
                {loadingHotel ? <Loader2 className="h-5 w-5 animate-spin" /> : <Hotel className="h-5 w-5" strokeWidth={1.5} />}
              </div>
              <h2 className="text-base font-medium text-cream-text">Hotel</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-mute">Sign in to configure branding, policies, and concierge settings.</p>
              <span className="mt-4 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-ember-orange">
                Sign in
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              </span>
            </button>
          </div>
        </div>
      </div>

      <GuestAuthPanel
        guest={guestProfile}
        onGuestChange={setGuestProfile}
        open={showGuestAuth}
        onOpenChange={setShowGuestAuth}
        hideTrigger
        allowSkip
        skipLabel="Continue without signing in"
        onSkip={goToAssistant}
        onAuthenticated={goToAssistant}
        title="Sign in to start"
        description="Create a free guest account for higher limits, saved bookings, and loyalty rewards — or continue without signing in."
      />
    </main>
  );
}
