"use client";

import { CalendarCheck, User } from "lucide-react";

export interface BookingSummary {
  id: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  guestName: string;
  guestPhone?: string;
  guestEmail?: string | null;
  status: string;
}

interface Props {
  booking: BookingSummary;
  hotelName?: string;
  isDark: boolean;
}

function formatStayDate(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function BookingSummaryCard({ booking, hotelName, isDark }: Props) {
  const shortId = booking.id.slice(0, 8).toUpperCase();
  const nights = Math.max(
    1,
    Math.round(
      (new Date(`${booking.checkOut}T12:00:00`).getTime() -
        new Date(`${booking.checkIn}T12:00:00`).getTime()) /
        (1000 * 60 * 60 * 24),
    ),
  );

  return (
    <div
      className={`mt-2 w-full max-w-[95%] sm:max-w-[80%] rounded-2xl border px-4 py-3 text-left shadow-sm ${
        isDark
          ? "border-emerald-500/25 bg-emerald-500/[0.08] text-neutral-100"
          : "border-emerald-200 bg-emerald-50/80 text-neutral-800"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
              isDark ? "bg-emerald-500/15 text-emerald-300" : "bg-emerald-100 text-emerald-700"
            }`}
          >
            <CalendarCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p
              className={`text-[10px] font-black uppercase tracking-[0.18em] ${
                isDark ? "text-emerald-300/80" : "text-emerald-700"
              }`}
            >
              {booking.status === "confirmed" ? "Booking confirmed" : booking.status}
            </p>
            <p className="truncate text-sm font-bold tracking-wide">#{shortId}</p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            isDark ? "bg-white/10 text-neutral-300" : "bg-white text-neutral-600"
          }`}
        >
          {nights} night{nights === 1 ? "" : "s"}
        </span>
      </div>

      <div className={`mt-3 space-y-1.5 border-t pt-3 text-[13px] ${isDark ? "border-white/10" : "border-emerald-200/80"}`}>
        {hotelName ? (
          <p className={`text-[11px] font-semibold uppercase tracking-wide ${isDark ? "text-neutral-400" : "text-neutral-500"}`}>
            {hotelName}
          </p>
        ) : null}
        <p className="font-semibold">
          {booking.roomType}
          <span className={isDark ? "text-neutral-400" : "text-neutral-500"}>
            {" "}
            · {booking.rooms} room{booking.rooms === 1 ? "" : "s"}
          </span>
        </p>
        <p className={isDark ? "text-neutral-300" : "text-neutral-700"}>
          {formatStayDate(booking.checkIn)} → {formatStayDate(booking.checkOut)}
        </p>
        <p className={`flex items-center gap-1.5 ${isDark ? "text-neutral-400" : "text-neutral-600"}`}>
          <User className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{booking.guestName}</span>
        </p>
      </div>
    </div>
  );
}
