"use client";

import { UtensilsCrossed } from "lucide-react";
import { formatReservationTime } from "@/lib/timeParsing";

export type PendingDining = {
  venueName: string;
  reservationDate: string;
  reservationTime: string;
  partySize: number;
  guestName: string;
  guestPhone: string;
  guestEmail?: string | null;
  specialRequests?: string | null;
};

export interface DiningSummary {
  id: string;
  venueName: string;
  reservationDate: string;
  reservationTime: string;
  partySize: number;
  guestName: string;
  guestPhone?: string;
  guestEmail?: string | null;
  status: string;
  specialRequests?: string | null;
}

interface Props {
  dining: DiningSummary;
  hotelName?: string;
  isDark: boolean;
}

function formatDate(value: string): string {
  const d = new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function DiningSummaryCard({ dining, hotelName, isDark }: Props) {
  const shortId = dining.id.slice(0, 8).toUpperCase();
  const timeLabel = formatReservationTime(dining.reservationTime);

  return (
    <div
      className={`mt-2 w-full max-w-[95%] sm:max-w-[80%] rounded-2xl border px-4 py-3 text-left shadow-sm ${
        isDark
          ? "border-amber-500/25 bg-amber-500/[0.08] text-neutral-100"
          : "border-amber-200 bg-amber-50/80 text-neutral-800"
      }`}
    >
      <div className="flex items-start gap-2">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
            isDark ? "bg-amber-500/15 text-amber-300" : "bg-amber-100 text-amber-700"
          }`}
        >
          <UtensilsCrossed className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${isDark ? "text-amber-300/80" : "text-amber-700"}`}>
            Table confirmed
          </p>
          <p className="text-sm font-bold">#{shortId}</p>
          {hotelName ? (
            <p className={`text-[11px] ${isDark ? "text-neutral-400" : "text-neutral-500"}`}>{hotelName}</p>
          ) : null}
          <p className="mt-1 text-[13px] font-semibold">{dining.venueName}</p>
          <p className={`text-[13px] ${isDark ? "text-neutral-300" : "text-neutral-700"}`}>
            {formatDate(dining.reservationDate)} at {timeLabel}
          </p>
          <p className={`text-[12px] ${isDark ? "text-neutral-400" : "text-neutral-600"}`}>
            {dining.partySize} guests · {dining.guestName}
          </p>
        </div>
      </div>
    </div>
  );
}
