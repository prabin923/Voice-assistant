"use client";

import { Activity } from "lucide-react";
import { formatReservationTime } from "@/lib/timeParsing";

export interface SpaSummary {
  id: string;
  serviceName: string;
  reservationDate: string;
  reservationTime: string;
  durationMinutes: number;
  guestName: string;
  price: number;
  currency: string;
  status: string;
}

interface Props {
  spa: SpaSummary;
  hotelName?: string;
  isDark: boolean;
}

function formatDate(value: string): string {
  const d = new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function SpaSummaryCard({ spa, hotelName, isDark }: Props) {
  const shortId = spa.id.slice(0, 8).toUpperCase();
  const timeLabel = formatReservationTime(spa.reservationTime);

  return (
    <div
      className={`mt-2 w-full max-w-[95%] sm:max-w-[80%] rounded-2xl border px-4 py-3 text-left shadow-sm transition-all duration-300 hover:scale-[1.01] ${
        isDark
          ? "border-emerald-500/25 bg-emerald-500/[0.08] text-neutral-100 shadow-emerald-500/5"
          : "border-emerald-200 bg-emerald-50/80 text-neutral-800 shadow-emerald-200/20"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
            isDark ? "bg-emerald-500/15 text-emerald-300" : "bg-emerald-100 text-emerald-700"
          }`}
        >
          <Activity className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${isDark ? "text-emerald-300/80" : "text-emerald-700"}`}>
              Spa Confirmed
            </p>
            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${isDark ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-100 text-emerald-800"}`}>
              {spa.currency} {spa.price}
            </span>
          </div>
          <p className="text-sm font-bold">#{shortId}</p>
          {hotelName ? (
            <p className={`text-[11px] ${isDark ? "text-neutral-400" : "text-neutral-500"}`}>{hotelName}</p>
          ) : null}
          <p className="mt-1 text-[13px] font-semibold">{spa.serviceName}</p>
          <p className={`text-[13px] ${isDark ? "text-neutral-300" : "text-neutral-700"}`}>
            {formatDate(spa.reservationDate)} at {timeLabel} ({spa.durationMinutes} mins)
          </p>
          <p className={`text-[12px] ${isDark ? "text-neutral-400" : "text-neutral-600"}`}>
            Guest: {spa.guestName}
          </p>
        </div>
      </div>
    </div>
  );
}
