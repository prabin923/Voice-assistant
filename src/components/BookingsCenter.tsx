"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarCheck, Download, Loader2, RefreshCw } from "lucide-react";
import { fetchJsonWithAuth } from "@/lib/clientAuth";

interface BookingRow {
  id: string;
  room_type: string;
  check_in: string;
  check_out: string;
  rooms: number;
  guest_name: string;
  guest_phone: string;
  guest_email: string | null;
  status: string;
  created_at: string;
}

interface Props {
  isDark: boolean;
  cardCls: string;
  labelCls: string;
  onToast: (message: string, type?: "success" | "delete" | "info") => void;
}

function formatDate(value: string): string {
  const d = new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function toCsv(rows: BookingRow[]): string {
  const header = ["id", "guest_name", "guest_phone", "guest_email", "room_type", "check_in", "check_out", "rooms", "status", "created_at"];
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.id,
        row.guest_name,
        row.guest_phone,
        row.guest_email ?? "",
        row.room_type,
        row.check_in,
        row.check_out,
        row.rooms,
        row.status,
        row.created_at,
      ].map(escape).join(",")
    );
  }
  return lines.join("\n");
}

export function BookingsCenter({ isDark, cardCls, labelCls, onToast }: Props) {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"all" | "upcoming">("upcoming");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchJsonWithAuth<{ bookings: BookingRow[] }>(
        `/api/bookings?mode=${mode}&limit=200`
      );
      setBookings(data.bookings ?? []);
    } catch {
      onToast("Failed to load bookings", "delete");
    } finally {
      setLoading(false);
    }
  }, [mode, onToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const exportCsv = () => {
    if (!bookings.length) {
      onToast("No bookings to export", "info");
      return;
    }
    const blob = new Blob([toCsv(bookings)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onToast("Bookings exported", "success");
  };

  const muted = isDark ? "text-neutral-500" : "text-neutral-600";
  const rowCls = isDark ? "border-white/10 bg-white/[0.02]" : "border-neutral-200 bg-white";

  return (
    <div className="space-y-4">
      <div className={cardCls}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-[#163a5f] dark:text-[#e4c449]" />
              Bookings
            </h2>
            <p className={`text-sm mt-1 ${muted}`}>Confirmed reservations from chat and API.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex rounded-xl p-1 ${isDark ? "bg-white/[0.04]" : "bg-neutral-100"}`}>
              {(["upcoming", "all"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${
                    mode === m
                      ? isDark ? "bg-white/10 text-white" : "bg-white text-neutral-900 shadow-sm"
                      : muted
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => void load()} className={`p-2 rounded-xl border ${rowCls}`} aria-label="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={exportCsv}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-[#163a5f] text-white"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className={cardCls}>
        {loading ? (
          <div className={`flex items-center justify-center py-12 ${muted}`}>
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Loading bookings…
          </div>
        ) : bookings.length === 0 ? (
          <p className={`text-sm py-8 text-center ${muted}`}>No bookings yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`text-left text-[10px] uppercase tracking-wider ${labelCls}`}>
                  <th className="pb-3 pr-3">Guest</th>
                  <th className="pb-3 pr-3">Room</th>
                  <th className="pb-3 pr-3">Stay</th>
                  <th className="pb-3 pr-3">Status</th>
                  <th className="pb-3">ID</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className={`border-t ${isDark ? "border-white/10" : "border-neutral-200"}`}>
                    <td className="py-3 pr-3 align-top">
                      <div className="font-semibold">{b.guest_name}</div>
                      <div className={`text-xs ${muted}`}>{b.guest_phone}</div>
                      {b.guest_email ? <div className={`text-xs ${muted}`}>{b.guest_email}</div> : null}
                    </td>
                    <td className="py-3 pr-3 align-top">
                      {b.room_type}
                      <div className={`text-xs ${muted}`}>{b.rooms} room{b.rooms === 1 ? "" : "s"}</div>
                    </td>
                    <td className="py-3 pr-3 align-top whitespace-nowrap">
                      {formatDate(b.check_in)} → {formatDate(b.check_out)}
                    </td>
                    <td className="py-3 pr-3 align-top capitalize">{b.status}</td>
                    <td className="py-3 align-top font-mono text-xs">{b.id.slice(0, 8).toUpperCase()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
