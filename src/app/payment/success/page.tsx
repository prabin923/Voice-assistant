"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2, AlertCircle, CalendarCheck, ExternalLink } from "lucide-react";
import { SiteShellBackdrop } from "@/components/SiteShellBackdrop";

interface BookingResult {
  id: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  guestName: string;
  guestEmail?: string | null;
  status: string;
  depositPaid: boolean;
  depositAmount: number;
  currency: string;
}

function formatDate(val: string) {
  return new Date(`${val}T12:00:00`).toLocaleDateString(undefined, {
    month: "long", day: "numeric", year: "numeric",
  });
}

function calendarUrl(b: BookingResult): string {
  const title = encodeURIComponent(`Hotel stay — ${b.roomType}`);
  const start = b.checkIn.replace(/-/g, "");
  const end = b.checkOut.replace(/-/g, "");
  const details = encodeURIComponent(`Booking #${b.id.slice(0, 8).toUpperCase()} · Deposit paid: ${b.currency} ${b.depositAmount}`);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}`;
}

function PaymentSuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");

  const [booking, setBooking] = useState<BookingResult | null>(null);
  const [error, setError] = useState(sessionId ? "" : "No session ID found.");
  const [loading, setLoading] = useState(Boolean(sessionId));

  useEffect(() => {
    if (!sessionId) return;

    fetch(`/api/payment/success?session_id=${encodeURIComponent(sessionId)}`)
      .then((r) => r.json())
      .then((data: { ok?: boolean; booking?: BookingResult; error?: string }) => {
        if (data.ok && data.booking) {
          setBooking(data.booking);
        } else {
          setError(data.error ?? "Could not confirm your booking.");
        }
      })
      .catch(() => setError("Network error — please contact the hotel."))
      .finally(() => setLoading(false));
  }, [sessionId]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-void-canvas text-cream-text">
      <SiteShellBackdrop />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">

          {loading && (
            <div className="flex flex-col items-center gap-4 text-center">
              <Loader2 className="w-10 h-10 animate-spin text-zinc-mute" />
              <p className="text-sm text-zinc-mute">Confirming your booking…</p>
            </div>
          )}

          {!loading && error && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h1 className="text-xl font-semibold">Something went wrong</h1>
              <p className="text-sm text-zinc-mute">{error}</p>
              <p className="text-xs text-zinc-mute">
                If your payment was charged, please contact the hotel directly with your Stripe receipt.
              </p>
              <Link href="/assistant" className="vapi-btn-ember mx-auto gap-2">
                Back to assistant
              </Link>
            </div>
          )}

          {!loading && booking && (
            <div className="space-y-5">
              {/* Success header */}
              <div className="text-center space-y-3">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-mint-pulse/30 bg-mint-pulse/10">
                  <CheckCircle2 className="w-8 h-8 text-mint-pulse" />
                </div>
                <h1 className="text-2xl font-semibold text-cream-text">Booking confirmed!</h1>
                <p className="text-sm text-zinc-mute">
                  Your deposit of <strong className="text-cream-text">{booking.currency} {booking.depositAmount.toFixed(2)}</strong> was received.
                  {booking.guestEmail && " A confirmation has been sent to your email."}
                </p>
              </div>

              {/* Booking card */}
              <div className="rounded-[5.6px] border border-mint-pulse/25 bg-mint-pulse/8 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-5 h-5 text-mint-pulse shrink-0" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-mint-pulse/80">Booking confirmed</p>
                    <p className="font-bold text-sm">#{booking.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                </div>

                <div className="space-y-2 border-t border-white/10 pt-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-mute">Room</span>
                    <span className="font-medium">{booking.roomType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-mute">Check-in</span>
                    <span className="font-medium">{formatDate(booking.checkIn)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-mute">Check-out</span>
                    <span className="font-medium">{formatDate(booking.checkOut)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-mute">Guest</span>
                    <span className="font-medium">{booking.guestName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-mute">Deposit paid</span>
                    <span className="font-medium text-mint-pulse">{booking.currency} {booking.depositAmount.toFixed(2)} ✓</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 sm:flex-row">
                <a
                  href={calendarUrl(booking)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="vapi-btn-ember flex-1 justify-center gap-2"
                >
                  <CalendarCheck className="w-4 h-4" /> Add to calendar
                </a>
                <Link href="/assistant" className="inline-flex items-center justify-center gap-2 rounded-[5.6px] border border-iron-border bg-carbon-surface px-4 py-2 text-sm text-bone-text hover:border-steel-border hover:text-cream-text transition-colors flex-1">
                  <ExternalLink className="w-4 h-4" /> Back to assistant
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="relative min-h-screen overflow-hidden bg-void-canvas text-cream-text flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-zinc-mute" />
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
