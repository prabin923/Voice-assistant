"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarCheck, Loader2, X } from "lucide-react";
import {
  fetchGuestBookings,
  cancelGuestBooking,
  type GuestBooking,
  type GuestProfile,
} from "@/lib/clientGuestAuth";

interface Props {
  guest: GuestProfile;
  isDark: boolean;
  onAskAboutBooking?: (booking: GuestBooking) => void;
}

function formatDate(value: string): string {
  const d = new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function MyStayPanel({ guest, isDark, onAskAboutBooking }: Props) {
  const [bookings, setBookings] = useState<GuestBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchGuestBookings();
      setBookings(list.filter((b) => b.status === "confirmed"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load stays");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, guest.id]);

  const upcoming = bookings.filter((b) => b.checkOut >= new Date().toISOString().slice(0, 10));

  return (
    <div
      className={`overflow-hidden rounded-[5.6px] border ${
        isDark ? "border-iron-border bg-carbon-surface/60" : "border-neutral-200 bg-white"
      }`}
    >
      <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? "border-iron-border" : "border-neutral-200"}`}>
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-4 w-4" style={{ color: "rgb(var(--hotel-accent-rgb))" }} />
          <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-neutral-300" : "text-neutral-700"}`}>
            My stay
          </span>
        </div>
        <span className={`text-[10px] font-mono uppercase ${isDark ? "text-zinc-mute" : "text-neutral-500"}`}>
          {guest.loyaltyTier}
        </span>
      </div>

      <div className="px-4 py-3 space-y-2 max-h-48 overflow-y-auto scrollbar-premium">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className={`h-5 w-5 animate-spin ${isDark ? "text-neutral-500" : "text-neutral-400"}`} />
          </div>
        ) : error ? (
          <p className={`text-xs ${isDark ? "text-amber-300/90" : "text-amber-700"}`}>{error}</p>
        ) : upcoming.length === 0 ? (
          <p className={`text-xs ${isDark ? "text-neutral-500" : "text-neutral-600"}`}>
            No upcoming stays. Ask {guest.name.split(" ")[0]}&apos;s concierge to book a room.
          </p>
        ) : (
          upcoming.map((booking) => (
            <div
              key={booking.id}
              className={`rounded-xl border px-3 py-2.5 text-left ${
                isDark ? "border-white/10 bg-white/[0.03]" : "border-neutral-200 bg-neutral-50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className={`text-xs font-semibold truncate ${isDark ? "text-neutral-200" : "text-neutral-800"}`}>
                    {booking.roomType}
                  </p>
                  <p className={`text-[11px] mt-0.5 ${isDark ? "text-neutral-500" : "text-neutral-600"}`}>
                    {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
                  </p>
                  <p className={`text-[10px] font-mono mt-1 ${isDark ? "text-neutral-600" : "text-neutral-500"}`}>
                    #{booking.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  {onAskAboutBooking ? (
                    <button
                      type="button"
                      onClick={() => onAskAboutBooking(booking)}
                      className={`text-[10px] font-semibold px-2 py-1 rounded-lg ${
                        isDark ? "bg-white/10 hover:bg-white/15 text-neutral-300" : "bg-white border border-neutral-200 text-neutral-700"
                      }`}
                    >
                      Ask
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={cancellingId === booking.id}
                    onClick={async () => {
                      setCancellingId(booking.id);
                      try {
                        await cancelGuestBooking(booking.id);
                        await load();
                      } catch {
                        setError("Could not cancel booking");
                      } finally {
                        setCancellingId(null);
                      }
                    }}
                    className={`text-[10px] font-semibold px-2 py-1 rounded-lg flex items-center gap-1 ${
                      isDark ? "text-red-400/80 hover:bg-red-500/10" : "text-red-600 hover:bg-red-50"
                    }`}
                  >
                    {cancellingId === booking.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
