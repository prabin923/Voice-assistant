"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays, Loader2, RefreshCw, Save, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, AlertCircle, Pencil,
} from "lucide-react";
import { fetchJsonWithAuth } from "@/lib/clientAuth";

interface RoomType { name: string }

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

interface AvailabilityResponse {
  byRoom: Array<{
    roomType: string;
    defaultInventory: number;
    available?: number;
    byDate?: Record<string, number>;
    bookedByDate?: Record<string, number>;
  }>;
}

interface Props {
  rooms: RoomType[];
  isDark: boolean;
  cardCls: string;
  inputCls: string;
  labelCls: string;
  onToast?: (message: string, type?: "success" | "delete" | "info") => void;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function todayIso(): string {
  return isoDate(new Date());
}

function monthTitle(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

/** Convert JS getDay() (0=Sun) to Mon-start index (0=Mon, 6=Sun). */
function monStartOffset(dateStr: string): number {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return (d.getUTCDay() + 6) % 7;
}

function addDaysStr(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return isoDate(d);
}

export function CalendarInventoryCenter({
  rooms, isDark, cardCls, inputCls, labelCls, onToast,
}: Props) {
  const [selectedRoom, setSelectedRoom] = useState(rooms[0]?.name ?? "");
  const [month, setMonth] = useState(() => {
    const d = new Date();
    d.setUTCDate(1);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  });
  const [availByDate, setAvailByDate] = useState<Record<string, number>>({});
  const [bookedByDate, setBookedByDate] = useState<Record<string, number>>({});
  const [defaultInventory, setDefaultInventory] = useState(1);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedCount, setSelectedCount] = useState(1);
  const [bookingsList, setBookingsList] = useState<BookingRow[]>([]);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!selectedRoom && rooms[0]?.name) setSelectedRoom(rooms[0].name);
  }, [rooms, selectedRoom]);

  const monthRange = useMemo(() => {
    const start = new Date(month);
    const end = new Date(month);
    end.setUTCMonth(end.getUTCMonth() + 1);
    return { checkIn: isoDate(start), checkOut: isoDate(end) };
  }, [month]);

  // All date strings in this month
  const days = useMemo(() => {
    const out: string[] = [];
    const end = monthRange.checkOut;
    let cursor = monthRange.checkIn;
    while (cursor < end) { out.push(cursor); cursor = addDaysStr(cursor, 1); }
    return out;
  }, [monthRange.checkIn, monthRange.checkOut]);

  // Blank prefix cells to align first day to Mon-start grid
  const leadingBlanks = useMemo(() => monStartOffset(days[0] ?? monthRange.checkIn), [days, monthRange.checkIn]);

  const loadAvailability = useCallback(async (showSpinner = false) => {
    if (!selectedRoom) return;
    if (showSpinner) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await fetchJsonWithAuth<AvailabilityResponse>(
        `/api/availability?checkIn=${monthRange.checkIn}&checkOut=${monthRange.checkOut}&groupBy=day`
      );
      const row = data.byRoom.find((r) => r.roomType === selectedRoom);
      setAvailByDate(row?.byDate ?? {});
      setBookedByDate(row?.bookedByDate ?? {});
      setDefaultInventory(row?.defaultInventory ?? 1);

      const def = row?.defaultInventory ?? 1;
      const byDate = row?.byDate ?? {};
      const bookedD = row?.bookedByDate ?? {};
      const ovr: Record<string, number> = {};
      for (const [d, free] of Object.entries(byDate)) {
        const total = free + (bookedD[d] ?? 0);
        if (total !== def) ovr[d] = total;
      }
      setOverrides(ovr);
    } catch {
      onToast?.("Failed to load calendar data", "delete");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [monthRange.checkIn, monthRange.checkOut, onToast, selectedRoom]);

  const loadBookings = useCallback(async () => {
    if (!selectedRoom) return;
    try {
      const bkData = await fetchJsonWithAuth<{ bookings: BookingRow[] }>(
        "/api/bookings?mode=upcoming&limit=40"
      );
      setBookingsList(bkData.bookings.filter((b) => b.room_type === selectedRoom));
    } catch {
      // non-critical — calendar still works without the bookings list
    }
  }, [selectedRoom]);

  const load = useCallback(async (showSpinner = false) => {
    await Promise.all([loadAvailability(showSpinner), loadBookings()]);
  }, [loadAvailability, loadBookings]);

  // Re-fetch availability when month or room changes; bookings only when room changes
  useEffect(() => { void loadAvailability(); }, [loadAvailability]);
  useEffect(() => { void loadBookings(); }, [loadBookings]);

  const saveDefault = async () => {
    if (!selectedRoom) return;
    setSaving(true);
    try {
      await fetchJsonWithAuth("/api/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomType: selectedRoom, defaultCount: defaultInventory }),
      });
      onToast?.(`Default inventory set to ${defaultInventory}`, "success");
      await load(true);
    } catch { onToast?.("Failed to save default inventory", "delete"); }
    finally { setSaving(false); }
  };

  const saveOverride = async () => {
    if (!selectedRoom || !selectedDate) return;
    setSaving(true);
    try {
      const booked = bookedByDate[selectedDate] ?? 0;
      const capacity = booked + Math.max(0, selectedCount);
      await fetchJsonWithAuth("/api/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomType: selectedRoom, date: selectedDate, count: capacity }),
      });
      onToast?.(`Override saved: ${selectedCount} free on ${selectedDate}`, "success");
      await load(true);
    } catch { onToast?.("Failed to save override", "delete"); }
    finally { setSaving(false); }
  };

  const clearOverride = async () => {
    if (!selectedRoom || !selectedDate) return;
    setSaving(true);
    try {
      await fetchJsonWithAuth("/api/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomType: selectedRoom, date: selectedDate, clearOverride: true }),
      });
      onToast?.(`Override cleared for ${selectedDate}`, "info");
      setSelectedDate("");
      await load(true);
    } catch { onToast?.("Failed to clear override", "delete"); }
    finally { setSaving(false); }
  };

  // Stats summary for the month
  const monthStats = useMemo(() => {
    const today = todayIso();
    let totalFree = 0, totalBooked = 0, soldOutDays = 0, futureDays = 0;
    for (const d of days) {
      if (d < today) continue;
      futureDays++;
      const free = availByDate[d] ?? 0;
      const booked = bookedByDate[d] ?? 0;
      totalFree += free;
      totalBooked += booked;
      if (free === 0) soldOutDays++;
    }
    const occupancy = futureDays > 0
      ? Math.round((totalBooked / ((totalFree + totalBooked) || 1)) * 100)
      : 0;
    return { totalBooked, soldOutDays, occupancy, futureDays };
  }, [days, availByDate, bookedByDate]);

  const today = todayIso();
  const muted = isDark ? "text-neutral-500" : "text-neutral-500";

  // Cell color logic
  function cellColor(date: string) {
    const free = availByDate[date] ?? 0;
    const total = free + (bookedByDate[date] ?? 0);
    const isPast = date < today;
    if (isPast) return "opacity-40";
    if (free === 0 && total > 0) return "bg-red-500/10 border-red-500/30 text-red-400";
    if (free <= 1) return "bg-amber-500/10 border-amber-500/30 text-amber-400";
    return "bg-emerald-500/8 border-emerald-500/25 text-emerald-400";
  }

  return (
    <div className="space-y-5">

      {/* ── Header + Controls ── */}
      <div className={cardCls}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-[#163a5f] dark:text-[#e4c449]" />
              Room Availability Calendar
            </h2>
            <p className={`text-sm mt-1 ${muted}`}>
              Live inventory connected to the AI assistant. Set defaults and per-date overrides. The assistant checks this calendar for every booking.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load(true)}
            className="flex items-center gap-1.5 rounded-[5.6px] border border-iron-border bg-carbon-surface px-3 py-2 text-sm text-bone-text hover:border-steel-border hover:text-cream-text transition-colors shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 mt-2">
          {/* Room selector */}
          <div>
            <label className={labelCls}>Room type</label>
            <select
              className={inputCls}
              value={selectedRoom}
              onChange={(e) => { setSelectedRoom(e.target.value); setSelectedDate(""); }}
            >
              {rooms.map((r) => <option key={r.name} value={r.name}>{r.name}</option>)}
            </select>
          </div>

          {/* Month navigation */}
          <div>
            <label className={labelCls}>Month</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { const n = new Date(month); n.setUTCMonth(n.getUTCMonth() - 1); setMonth(n); setSelectedDate(""); }}
                className="flex items-center justify-center h-10 w-10 rounded-[5.6px] border border-iron-border bg-carbon-surface text-bone-text hover:border-steel-border hover:text-cream-text transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="flex-1 text-center text-sm font-medium text-cream-text">{monthTitle(month)}</span>
              <button
                type="button"
                onClick={() => { const n = new Date(month); n.setUTCMonth(n.getUTCMonth() + 1); setMonth(n); setSelectedDate(""); }}
                className="flex items-center justify-center h-10 w-10 rounded-[5.6px] border border-iron-border bg-carbon-surface text-bone-text hover:border-steel-border hover:text-cream-text transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Default inventory */}
          <div>
            <label className={labelCls}>Default rooms/night</label>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                max={100}
                className={inputCls}
                value={defaultInventory}
                onChange={(e) => setDefaultInventory(Math.max(0, Number(e.target.value) || 0))}
              />
              <button
                type="button"
                onClick={() => void saveDefault()}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-[5.6px] border border-ember-orange/40 bg-ember-orange/10 px-3 text-sm font-medium text-ember-orange hover:bg-ember-orange/20 transition-colors disabled:opacity-50 shrink-0"
              >
                <Save className="w-3.5 h-3.5" />
                Save
              </button>
            </div>
          </div>
        </div>

        {/* Stats row */}
        {!loading && (
          <div className="grid grid-cols-3 gap-3 mt-1">
            {[
              { label: "Booked (future)", value: monthStats.totalBooked, icon: <CheckCircle2 className="w-3.5 h-3.5 text-mint-pulse" /> },
              { label: "Sold-out days", value: monthStats.soldOutDays, icon: <XCircle className="w-3.5 h-3.5 text-red-400" /> },
              { label: "Occupancy", value: `${monthStats.occupancy}%`, icon: <AlertCircle className="w-3.5 h-3.5 text-amber-400" /> },
            ].map(({ label, value, icon }) => (
              <div key={label} className="rounded-[5.6px] border border-iron-border bg-slab-elevated px-3 py-2.5">
                <div className="flex items-center gap-1.5 mb-0.5">{icon}<span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-mute">{label}</span></div>
                <p className="text-xl font-bold text-cream-text">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Calendar Grid ── */}
      <div className={cardCls}>
        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-7 h-7 animate-spin text-ember-orange" />
          </div>
        ) : (
          <>
            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAY_NAMES.map((d) => (
                <div key={d} className={`text-center text-[10px] font-bold uppercase tracking-wider py-1.5 ${muted}`}>
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar cells */}
            <div className="grid grid-cols-7 gap-1">
              {/* Leading blank cells */}
              {Array.from({ length: leadingBlanks }).map((_, i) => (
                <div key={`blank-${i}`} />
              ))}

              {/* Day cells */}
              {days.map((date) => {
                const free = availByDate[date] ?? 0;
                const booked = bookedByDate[date] ?? 0;
                const isToday = date === today;
                const isSelected = selectedDate === date;
                const hasOverride = date in overrides;
                const isPast = date < today;

                return (
                  <button
                    key={date}
                    type="button"
                    disabled={isPast}
                    onClick={() => {
                      setSelectedDate(date);
                      setSelectedCount(free);
                    }}
                    className={`relative rounded-[5.6px] border p-2 text-left transition-all disabled:cursor-not-allowed
                      ${isSelected
                        ? "border-ember-orange bg-ember-orange/15 ring-1 ring-ember-orange/50"
                        : isToday
                          ? "border-amber-400/60 bg-amber-400/8"
                          : `border-iron-border hover:border-steel-border ${cellColor(date)}`
                      }
                      ${isPast ? "opacity-35" : ""}
                    `}
                  >
                    <p className={`text-[11px] font-bold ${isToday ? "text-amber-300" : isSelected ? "text-ember-orange" : "text-cream-text"}`}>
                      {date.slice(8, 10)}
                      {isToday && <span className="ml-1 text-[8px] font-black uppercase tracking-widest text-amber-300">today</span>}
                    </p>
                    <p className={`text-[10px] font-medium mt-0.5 ${free > 1 ? "text-emerald-400" : free === 1 ? "text-amber-400" : "text-red-400"}`}>
                      {free === 0 ? "full" : `${free} free`}
                    </p>
                    {booked > 0 && (
                      <p className={`text-[9px] mt-0.5 ${muted}`}>{booked} booked</p>
                    )}
                    {hasOverride && (
                      <span className="absolute top-1 right-1">
                        <Pencil className="w-2.5 h-2.5 text-blue-400" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-iron-border">
              {[
                { color: "bg-emerald-400", label: "Available" },
                { color: "bg-amber-400", label: "1 room left" },
                { color: "bg-red-400", label: "Fully booked" },
                { color: "bg-amber-300", label: "Today" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                  <span className={`text-[10px] ${muted}`}>{label}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <Pencil className="w-2.5 h-2.5 text-blue-400" />
                <span className={`text-[10px] ${muted}`}>Override set</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Date Override Panel ── */}
      {selectedDate && (
        <div className={cardCls}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-cream-text">
                Override — {new Date(`${selectedDate}T00:00:00Z`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
              </h3>
              <p className={`text-xs mt-0.5 ${muted}`}>
                Default: {defaultInventory} rooms. Currently booked: {bookedByDate[selectedDate] ?? 0}. Free: {availByDate[selectedDate] ?? 0}.
                {selectedDate in overrides ? ` (Override active: ${overrides[selectedDate]} total capacity)` : " (Using default)"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDate("")}
              className={`text-xs ${muted} hover:text-cream-text`}
            >
              ✕
            </button>
          </div>

          <div className="flex flex-wrap items-end gap-3 mt-2">
            <div>
              <label className={labelCls}>Free rooms to set</label>
              <input
                type="number"
                min={0}
                max={100}
                className={`${inputCls} w-28`}
                value={selectedCount}
                onChange={(e) => setSelectedCount(Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
            <button
              type="button"
              onClick={() => void saveOverride()}
              disabled={saving}
              className="vapi-btn-ember vapi-btn-compact disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save override
            </button>
            {selectedDate in overrides && (
              <button
                type="button"
                onClick={() => void clearOverride()}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-[5.6px] border border-iron-border bg-carbon-surface px-3 py-2 text-sm text-zinc-mute hover:text-red-300 hover:border-red-500/30 transition-colors disabled:opacity-50"
              >
                Clear override
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Upcoming Bookings ── */}
      <div className={cardCls}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-cream-text flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-ember-orange" />
            Upcoming bookings — {selectedRoom}
          </h3>
          <span className="rounded-full border border-iron-border bg-slab-elevated px-2.5 py-0.5 text-xs font-medium text-zinc-mute">
            {bookingsList.length}
          </span>
        </div>
        {bookingsList.length === 0 ? (
          <p className={`text-sm ${muted}`}>No upcoming confirmed bookings for this room type.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-premium">
            {bookingsList.map((b) => {
              const nights = Math.max(1, Math.round(
                (new Date(`${b.check_out}T00:00:00Z`).getTime() - new Date(`${b.check_in}T00:00:00Z`).getTime()) / 86400000
              ));
              return (
                <div
                  key={b.id}
                  className="flex items-start justify-between gap-3 rounded-[5.6px] border border-iron-border bg-slab-elevated px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-cream-text truncate">{b.guest_name}</p>
                    <p className={`text-xs mt-0.5 ${muted}`}>
                      {b.check_in} → {b.check_out} · {nights} night{nights !== 1 ? "s" : ""} · {b.rooms} room{b.rooms !== 1 ? "s" : ""}
                    </p>
                    <p className={`text-xs ${muted}`}>{b.guest_phone}{b.guest_email ? ` · ${b.guest_email}` : ""}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-mint-pulse/10 border border-mint-pulse/25 px-2 py-0.5 text-[10px] font-semibold text-mint-pulse">
                    {b.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
