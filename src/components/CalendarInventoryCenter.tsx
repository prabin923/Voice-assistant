"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Loader2, RefreshCw, Save } from "lucide-react";
import { fetchJsonWithAuth } from "@/lib/clientAuth";

interface RoomType {
  name: string;
}

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

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function monthTitle(value: Date): string {
  return value.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function CalendarInventoryCenter({
  rooms,
  isDark,
  cardCls,
  inputCls,
  labelCls,
  onToast,
}: Props) {
  const [selectedRoom, setSelectedRoom] = useState(rooms[0]?.name ?? "");
  const [month, setMonth] = useState(() => {
    const d = new Date();
    d.setUTCDate(1);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  });
  const [availabilityByDate, setAvailabilityByDate] = useState<Record<string, number>>({});
  const [bookedByDate, setBookedByDate] = useState<Record<string, number>>({});
  const [defaultInventory, setDefaultInventory] = useState(1);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedCount, setSelectedCount] = useState(1);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!selectedRoom && rooms[0]?.name) {
      setSelectedRoom(rooms[0].name);
    }
  }, [rooms, selectedRoom]);

  const monthRange = useMemo(() => {
    const start = new Date(month);
    const end = new Date(month);
    end.setUTCMonth(end.getUTCMonth() + 1);
    return { checkIn: isoDate(start), checkOut: isoDate(end) };
  }, [month]);

  const days = useMemo(() => {
    const out: string[] = [];
    const start = new Date(`${monthRange.checkIn}T00:00:00.000Z`);
    const end = new Date(`${monthRange.checkOut}T00:00:00.000Z`);
    const cursor = new Date(start);
    while (cursor < end) {
      out.push(isoDate(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return out;
  }, [monthRange.checkIn, monthRange.checkOut]);

  const load = useCallback(
    async (showSpinner = false) => {
      if (!selectedRoom) return;
      if (showSpinner) setRefreshing(true);
      if (!showSpinner) setLoading(true);
      try {
        const availabilityData = await fetchJsonWithAuth<AvailabilityResponse>(
          `/api/availability?checkIn=${monthRange.checkIn}&checkOut=${monthRange.checkOut}&groupBy=day`
        );
        const row = availabilityData.byRoom.find((item) => item.roomType === selectedRoom);
        setAvailabilityByDate(row?.byDate ?? {});
        setBookedByDate(row?.bookedByDate ?? {});
        setDefaultInventory(row?.defaultInventory ?? 1);

        const bookingData = await fetchJsonWithAuth<{ bookings: BookingRow[] }>(
          "/api/bookings?mode=upcoming&limit=40"
        );
        setBookings(bookingData.bookings.filter((b) => b.room_type === selectedRoom));
      } catch {
        onToast?.("Failed to load calendar data", "delete");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [monthRange.checkIn, monthRange.checkOut, onToast, selectedRoom]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const saveDefault = async () => {
    if (!selectedRoom) return;
    setSaving(true);
    try {
      await fetchJsonWithAuth("/api/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomType: selectedRoom, defaultCount: defaultInventory }),
      });
      onToast?.("Default inventory saved", "success");
      await load(true);
    } catch {
      onToast?.("Failed to save default inventory", "delete");
    } finally {
      setSaving(false);
    }
  };

  const saveOverride = async () => {
    if (!selectedRoom || !selectedDate) return;
    setSaving(true);
    try {
      const booked = bookedByDate[selectedDate] ?? 0;
      const desiredFree = Math.max(0, selectedCount);
      const capacity = booked + desiredFree;
      await fetchJsonWithAuth("/api/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomType: selectedRoom, date: selectedDate, count: capacity }),
      });
      onToast?.(`Saved override for ${selectedDate}`, "success");
      await load(true);
    } catch {
      onToast?.("Failed to save day override", "delete");
    } finally {
      setSaving(false);
    }
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
      onToast?.(`Cleared override for ${selectedDate}`, "info");
      await load(true);
    } catch {
      onToast?.("Failed to clear day override", "delete");
    } finally {
      setSaving(false);
    }
  };

  const muted = isDark ? "text-neutral-500" : "text-neutral-600";

  return (
    <div className="space-y-6">
      <div className={cardCls}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-[#163a5f] dark:text-[#e4c449]" />
              Room availability calendar
            </h2>
            <p className={`text-sm mt-1 ${muted}`}>
              Set default inventory and per-day overrides. Each day shows how many rooms are free vs booked.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load(true)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition ${
              isDark ? "border-neutral-700 text-neutral-300" : "border-neutral-300 text-neutral-700 bg-white"
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 mt-5">
          <div>
            <label className={labelCls}>Room type</label>
            <select
              className={inputCls}
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
            >
              {rooms.map((room) => (
                <option key={room.name} value={room.name}>
                  {room.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Month</label>
            <div className="flex gap-2">
              <button
                type="button"
                className={inputCls}
                onClick={() => {
                  const next = new Date(month);
                  next.setUTCMonth(next.getUTCMonth() - 1);
                  setMonth(next);
                }}
              >
                Prev
              </button>
              <button
                type="button"
                className={inputCls}
                onClick={() => {
                  const next = new Date(month);
                  next.setUTCMonth(next.getUTCMonth() + 1);
                  setMonth(next);
                }}
              >
                Next
              </button>
            </div>
            <p className={`text-xs mt-2 ${muted}`}>{monthTitle(month)}</p>
          </div>
          <div>
            <label className={labelCls}>Default inventory / night</label>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                className={inputCls}
                value={defaultInventory}
                onChange={(e) => setDefaultInventory(Math.max(0, Number(e.target.value) || 0))}
              />
              <button
                type="button"
                onClick={() => void saveDefault()}
                disabled={saving}
                className="px-3 rounded-xl text-sm bg-[#163a5f] text-white"
              >
                <Save className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={cardCls}>
        {loading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="w-7 h-7 animate-spin text-[#163a5f] dark:text-[#e4c449]" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
              {days.map((date) => {
                const available = availabilityByDate[date] ?? 0;
                const booked = bookedByDate[date] ?? 0;
                const isSelected = selectedDate === date;
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => {
                      setSelectedDate(date);
                      setSelectedCount(available);
                    }}
                    className={`rounded-xl border p-3 text-left transition ${
                      isSelected
                        ? "border-[#163a5f] bg-[#163a5f]/10"
                        : isDark
                          ? "border-neutral-800 bg-neutral-900/40"
                          : "border-neutral-200 bg-neutral-50"
                    }`}
                  >
                    <p className="text-[11px] font-bold">{date.slice(8, 10)}</p>
                    <p className={`text-[11px] mt-1 ${available > 0 ? "text-emerald-500" : "text-red-400"}`}>
                      {available} free
                    </p>
                    <p className={`text-[10px] mt-0.5 ${isDark ? "text-neutral-500" : "text-neutral-500"}`}>
                      {booked} booked
                    </p>
                  </button>
                );
              })}
            </div>

            {selectedDate && (
              <div className={`mt-5 rounded-xl p-4 border ${isDark ? "border-neutral-800 bg-neutral-900/40" : "border-neutral-200 bg-neutral-50"}`}>
                <p className="text-sm font-semibold mb-3">Override {selectedDate}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    className={inputCls}
                    value={selectedCount}
                    onChange={(e) => setSelectedCount(Math.max(0, Number(e.target.value) || 0))}
                  />
                  <button
                    type="button"
                    onClick={() => void saveOverride()}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl text-sm bg-[#163a5f] text-white"
                  >
                    Save override
                  </button>
                  <button
                    type="button"
                    onClick={() => void clearOverride()}
                    disabled={saving}
                    className={`px-4 py-2 rounded-xl text-sm border ${
                      isDark ? "border-neutral-700 text-neutral-300" : "border-neutral-300 text-neutral-700 bg-white"
                    }`}
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className={cardCls}>
        <h3 className="font-semibold mb-3">Upcoming bookings ({bookings.length})</h3>
        {bookings.length === 0 ? (
          <p className={`text-sm ${muted}`}>No upcoming bookings for this room type.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className={`rounded-xl p-3 border ${isDark ? "border-neutral-800 bg-neutral-900/40" : "border-neutral-200 bg-neutral-50"}`}
              >
                <p className="text-sm font-semibold">{booking.guest_name}</p>
                <p className={`text-xs ${muted}`}>
                  {booking.check_in} to {booking.check_out} · {booking.rooms} room(s)
                </p>
                <p className={`text-xs ${muted}`}>{booking.guest_phone}{booking.guest_email ? ` · ${booking.guest_email}` : ""}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
