"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarCheck, Download, Loader2, Plus, RefreshCw, XCircle } from "lucide-react";
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
  rooms: { name: string }[];
  onToast: (message: string, type?: "success" | "delete" | "info") => void;
}

type NewBookingForm = {
  roomType: string;
  checkIn: string;
  checkOut: string;
  rooms: string;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
};

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

function blankForm(rooms: { name: string }[]): NewBookingForm {
  return {
    roomType: rooms[0]?.name ?? "",
    checkIn: "",
    checkOut: "",
    rooms: "1",
    guestName: "",
    guestPhone: "",
    guestEmail: "",
  };
}

export function BookingsCenter({ isDark, cardCls, labelCls, rooms, onToast }: Props) {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [mode, setMode] = useState<"all" | "upcoming">("upcoming");
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<NewBookingForm>(() => blankForm(rooms));

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

  const cancelBooking = async (id: string) => {
    if (!window.confirm("Cancel this booking?")) return;
    setCancellingId(id);
    try {
      await fetchJsonWithAuth<{ success: boolean }>(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      onToast("Booking cancelled", "success");
      await load();
    } catch {
      onToast("Failed to cancel booking", "delete");
    } finally {
      setCancellingId(null);
    }
  };

  const createBooking = async () => {
    if (!form.roomType || !form.checkIn || !form.checkOut || !form.guestName.trim() || !form.guestPhone.trim()) {
      onToast("Room, dates, guest name and phone are required", "info");
      return;
    }
    if (form.checkIn >= form.checkOut) {
      onToast("Check-out must be after check-in", "info");
      return;
    }
    setCreating(true);
    try {
      // Goes through the same createBookingSafe transaction as AI bookings, so
      // the availability check prevents any double-booking conflict.
      await fetchJsonWithAuth<{ success: boolean }>("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomType: form.roomType,
          checkIn: form.checkIn,
          checkOut: form.checkOut,
          rooms: Math.max(1, Number(form.rooms) || 1),
          guestName: form.guestName.trim(),
          guestPhone: form.guestPhone.trim(),
          guestEmail: form.guestEmail.trim() || null,
        }),
      });
      onToast("Booking created", "success");
      setForm(blankForm(rooms));
      setShowForm(false);
      await load();
    } catch (e) {
      // Surfaces "Requested room is not available for those dates." on conflict.
      onToast(e instanceof Error ? e.message : "Failed to create booking", "delete");
    } finally {
      setCreating(false);
    }
  };

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
  const inputCls = `w-full mt-1 rounded-xl border px-3 py-2 text-sm ${isDark ? "border-white/10 bg-white/[0.04] text-white" : "border-neutral-200 bg-white text-neutral-900"}`;

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
              onClick={() => setShowForm((s) => !s)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border ${rowCls}`}
            >
              <Plus className="w-4 h-4" />
              New booking
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

        {showForm && (
          <div className={`mt-4 border-t pt-4 ${isDark ? "border-white/10" : "border-neutral-200"}`}>
            <p className={`text-xs mb-3 ${muted}`}>
              Manual booking for a walk-in or phone guest. Availability is checked against the
              same inventory the AI uses, so it can&apos;t double-book.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Room type</label>
                <select
                  className={inputCls}
                  value={form.roomType}
                  onChange={(e) => setForm({ ...form, roomType: e.target.value })}
                >
                  {rooms.length === 0 && <option value="">No rooms configured</option>}
                  {rooms.map((r) => (
                    <option key={r.name} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Rooms</label>
                <input type="number" min={1} className={inputCls} value={form.rooms}
                  onChange={(e) => setForm({ ...form, rooms: e.target.value })} />
              </div>
              <div className="hidden lg:block" />
              <div>
                <label className={labelCls}>Check-in</label>
                <input type="date" className={inputCls} value={form.checkIn}
                  onChange={(e) => setForm({ ...form, checkIn: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Check-out</label>
                <input type="date" className={inputCls} value={form.checkOut}
                  onChange={(e) => setForm({ ...form, checkOut: e.target.value })} />
              </div>
              <div className="hidden lg:block" />
              <div>
                <label className={labelCls}>Guest name</label>
                <input className={inputCls} value={form.guestName}
                  onChange={(e) => setForm({ ...form, guestName: e.target.value })} placeholder="Full name" />
              </div>
              <div>
                <label className={labelCls}>Guest phone</label>
                <input className={inputCls} value={form.guestPhone}
                  onChange={(e) => setForm({ ...form, guestPhone: e.target.value })} placeholder="+1 555 0100" />
              </div>
              <div>
                <label className={labelCls}>Guest email (optional)</label>
                <input className={inputCls} value={form.guestEmail}
                  onChange={(e) => setForm({ ...form, guestEmail: e.target.value })} placeholder="guest@email.com" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => void createBooking()}
                disabled={creating}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[#163a5f] text-white disabled:opacity-60"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create booking
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm(blankForm(rooms)); }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border ${rowCls}`}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
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
                  <th className="pb-3 pr-3">ID</th>
                  <th className="pb-3">Actions</th>
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
                    <td className="py-3 pr-3 align-top font-mono text-xs">{b.id.slice(0, 8).toUpperCase()}</td>
                    <td className="py-3 align-top">
                      {b.status === "confirmed" ? (
                        <button
                          type="button"
                          onClick={() => void cancelBooking(b.id)}
                          disabled={cancellingId === b.id}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold ${
                            isDark
                              ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                              : "border-red-200 text-red-600 hover:bg-red-50"
                          }`}
                        >
                          {cancellingId === b.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          Cancel
                        </button>
                      ) : (
                        <span className={`text-xs ${muted}`}>—</span>
                      )}
                    </td>
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
