"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarCheck, Loader2, X, Download, Star, Settings, Award } from "lucide-react";
import {
  fetchGuestBookings,
  cancelGuestBooking,
  type GuestBooking,
  type GuestProfile,
  guestAuthHeaders,
} from "@/lib/clientGuestAuth";
import { LoyaltyBadge } from "@/components/LoyaltyBadge";
import { ReviewPanel } from "@/components/ReviewPanel";

interface Props {
  guest: GuestProfile;
  isDark: boolean;
  onAskAboutBooking?: (booking: GuestBooking) => void;
}

interface Preferences {
  roomTemperature?: string;
  pillowType?: string;
  dietaryRestrictions?: string[];
  minibarPreferences?: string[];
}

function formatDate(value: string): string {
  const d = new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function MyStayPanel({ guest, isDark, onAskAboutBooking }: Props) {
  const [bookings, setBookings] = useState<GuestBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  
  // Tabs: "stays", "preferences", "loyalty"
  const [activeTab, setActiveTab] = useState<"stays" | "preferences" | "loyalty">("stays");

  // Preferences state
  const [prefs, setPrefs] = useState<Preferences>({});
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [prefsSuccess, setPrefsSuccess] = useState(false);
  const [prefsError, setPrefsError] = useState<string | null>(null);

  // Review states per booking ID
  const [reviewedBookings, setReviewedBookings] = useState<Record<string, boolean>>({});
  const [openReviewId, setOpenReviewId] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchGuestBookings();
      // Keep all confirmed/cancelled stays for past/upcoming logic
      setBookings(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load stays");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPreferences = useCallback(async () => {
    setPrefsLoading(true);
    setPrefsError(null);
    try {
      const res = await fetch("/api/guest/preferences", {
        headers: guestAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setPrefs(data.preferences || {});
      }
    } catch (e) {
      setPrefsError("Failed to load preferences");
    } finally {
      setPrefsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBookings();
    void loadPreferences();
  }, [loadBookings, loadPreferences, guest.id]);

  const savePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setPrefsLoading(true);
    setPrefsError(null);
    setPrefsSuccess(false);
    try {
      const res = await fetch("/api/guest/preferences", {
        method: "PUT",
        headers: guestAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(prefs),
      });
      if (!res.ok) throw new Error("Failed to save preferences");
      setPrefsSuccess(true);
      setTimeout(() => setPrefsSuccess(false), 2000);
    } catch (e) {
      setPrefsError("Failed to save preferences");
    } finally {
      setPrefsLoading(false);
    }
  };

  const handleExportChat = () => {
    const token = guestAuthHeaders().get("Authorization");
    const url = `/api/guest/conversations${token ? `?auth=${encodeURIComponent(token)}` : ""}`;
    
    // Create an anchor element to trigger the download
    const link = document.createElement("a");
    link.href = url;
    link.download = "staynep-chat-history.md";
    
    // We append the Authorization header via fetching then generating a blob if needed,
    // or since it's a GET request, we can fetch it directly using guestAuthHeaders.
    fetch("/api/guest/conversations", { headers: guestAuthHeaders() })
      .then((res) => res.blob())
      .then((blob) => {
        const blobUrl = window.URL.createObjectURL(blob);
        link.href = blobUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      })
      .catch(() => {
        alert("Failed to export chat history");
      });
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  
  // Confirmed and checkOut is today or in future
  const upcoming = bookings.filter((b) => b.status === "confirmed" && b.checkOut >= todayStr);
  
  // Confirmed and checkOut is in past
  const past = bookings.filter((b) => b.status === "confirmed" && b.checkOut < todayStr);

  return (
    <div
      className={`overflow-hidden rounded-2xl border transition-all duration-300 ${
        isDark
          ? "border-neutral-800 bg-neutral-900/90 shadow-2xl shadow-black/40"
          : "border-neutral-200 bg-white shadow-lg"
      }`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3.5 border-b ${isDark ? "border-neutral-800" : "border-neutral-200"}`}>
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-4 w-4" style={{ color: "rgb(var(--hotel-accent-rgb))" }} />
          <span className={`text-xs font-black uppercase tracking-[0.15em] ${isDark ? "text-neutral-200" : "text-neutral-700"}`}>
            My Stay
          </span>
        </div>
        <button
          onClick={handleExportChat}
          className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${
            isDark
              ? "border-neutral-800 hover:bg-neutral-800 text-neutral-300 hover:text-white"
              : "border-neutral-200 hover:bg-neutral-50 text-neutral-600 hover:text-black"
          }`}
          title="Export Conversation History"
        >
          <Download className="h-3 w-3" />
          Export Chat
        </button>
      </div>

      {/* Tabs Menu */}
      <div className={`flex border-b text-xs ${isDark ? "border-neutral-800 bg-neutral-950/30" : "border-neutral-200 bg-neutral-50"}`}>
        <button
          onClick={() => setActiveTab("stays")}
          className={`flex-1 py-2 font-bold transition-all border-b-2 ${
            activeTab === "stays"
              ? "border-amber-500 text-amber-500"
              : `border-transparent ${isDark ? "text-neutral-500 hover:text-neutral-300" : "text-neutral-500 hover:text-neutral-700"}`
          }`}
        >
          Stays
        </button>
        <button
          onClick={() => setActiveTab("preferences")}
          className={`flex-1 py-2 font-bold transition-all border-b-2 ${
            activeTab === "preferences"
              ? "border-amber-500 text-amber-500"
              : `border-transparent ${isDark ? "text-neutral-500 hover:text-neutral-300" : "text-neutral-500 hover:text-neutral-700"}`
          }`}
        >
          Preferences
        </button>
        <button
          onClick={() => setActiveTab("loyalty")}
          className={`flex-1 py-2 font-bold transition-all border-b-2 ${
            activeTab === "loyalty"
              ? "border-amber-500 text-amber-500"
              : `border-transparent ${isDark ? "text-neutral-500 hover:text-neutral-300" : "text-neutral-500 hover:text-neutral-700"}`
          }`}
        >
          Loyalty
        </button>
      </div>

      {/* Tab Contents */}
      <div className="p-4 max-h-[300px] overflow-y-auto scrollbar-premium">
        
        {/* Stays Tab */}
        {activeTab === "stays" && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className={`h-6 w-6 animate-spin ${isDark ? "text-neutral-500" : "text-neutral-400"}`} />
              </div>
            ) : error ? (
              <p className={`text-xs text-center ${isDark ? "text-red-400/90" : "text-red-600"}`}>{error}</p>
            ) : bookings.length === 0 ? (
              <p className={`text-xs text-center py-6 ${isDark ? "text-neutral-500" : "text-neutral-500"}`}>
                No bookings found. Try asking our assistant to book a room!
              </p>
            ) : (
              <>
                {/* Upcoming Stays */}
                {upcoming.length > 0 && (
                  <div className="space-y-2">
                    <p className={`text-[10px] font-black uppercase tracking-wider ${isDark ? "text-neutral-400" : "text-neutral-500"}`}>
                      Upcoming Stays
                    </p>
                    {upcoming.map((booking) => (
                      <div
                        key={booking.id}
                        className={`rounded-xl border p-3 text-left transition-all ${
                          isDark ? "border-neutral-800 bg-neutral-900/40" : "border-neutral-200 bg-neutral-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className={`text-xs font-bold truncate ${isDark ? "text-neutral-200" : "text-neutral-800"}`}>
                              {booking.roomType}
                            </p>
                            <p className={`text-[11px] mt-0.5 ${isDark ? "text-neutral-400" : "text-neutral-600"}`}>
                              {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)} ({booking.rooms} room{booking.rooms === 1 ? "" : "s"})
                            </p>
                            <p className={`text-[9px] font-mono mt-1 ${isDark ? "text-neutral-600" : "text-neutral-400"}`}>
                              #{booking.id.slice(0, 8).toUpperCase()}
                            </p>
                          </div>
                          <div className="flex flex-col gap-1.5 shrink-0">
                            {onAskAboutBooking && (
                              <button
                                type="button"
                                onClick={() => onAskAboutBooking(booking)}
                                className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${
                                  isDark
                                    ? "border-neutral-800 hover:bg-neutral-800 text-neutral-300"
                                    : "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-100"
                                }`}
                              >
                                Ask AI
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={cancellingId === booking.id}
                              onClick={async () => {
                                setCancellingId(booking.id);
                                try {
                                  await cancelGuestBooking(booking.id);
                                  await loadBookings();
                                } catch {
                                  setError("Could not cancel booking");
                                } finally {
                                  setCancellingId(null);
                                }
                              }}
                              className={`text-[10px] font-bold px-2 py-1 rounded-lg flex items-center justify-center gap-1 transition-all ${
                                isDark ? "text-red-400/80 hover:bg-red-500/10" : "text-red-600 hover:bg-red-50"
                              }`}
                            >
                              {cancellingId === booking.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Past Stays */}
                {past.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-neutral-800/40">
                    <p className={`text-[10px] font-black uppercase tracking-wider ${isDark ? "text-neutral-400" : "text-neutral-500"}`}>
                      Past Stays
                    </p>
                    {past.map((booking) => (
                      <div
                        key={booking.id}
                        className={`rounded-xl border p-3 text-left transition-all space-y-2 ${
                          isDark ? "border-neutral-800 bg-neutral-900/20" : "border-neutral-200 bg-neutral-50/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className={`text-xs font-bold truncate ${isDark ? "text-neutral-300" : "text-neutral-700"}`}>
                              {booking.roomType}
                            </p>
                            <p className={`text-[11px] mt-0.5 ${isDark ? "text-neutral-400" : "text-neutral-600"}`}>
                              {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
                            </p>
                          </div>
                          {!reviewedBookings[booking.id] && openReviewId !== booking.id && (
                            <button
                              type="button"
                              onClick={() => setOpenReviewId(booking.id)}
                              className="text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 text-amber-500 border border-amber-500/20 hover:bg-amber-500/5 transition-all"
                            >
                              <Star className="h-3 w-3 fill-amber-500" />
                              Review
                            </button>
                          )}
                        </div>

                        {openReviewId === booking.id && (
                          <div className="mt-1">
                            <ReviewPanel
                              bookingId={booking.id}
                              onSuccess={() => {
                                setReviewedBookings((prev) => ({ ...prev, [booking.id]: true }));
                                setOpenReviewId(null);
                              }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === "preferences" && (
          <form onSubmit={savePreferences} className="space-y-3 text-left">
            {prefsError && <p className="text-[10px] text-red-400 font-medium">{prefsError}</p>}
            
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                Room Temperature Preference
              </label>
              <input
                type="text"
                value={prefs.roomTemperature || ""}
                onChange={(e) => setPrefs({ ...prefs, roomTemperature: e.target.value })}
                placeholder="e.g. 72°F / 22°C"
                className="w-full text-xs px-3 py-2 rounded-lg border border-white/10 bg-black/20 text-neutral-200 placeholder-neutral-500 focus:border-amber-500/50 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                Pillow Type
              </label>
              <select
                value={prefs.pillowType || ""}
                onChange={(e) => setPrefs({ ...prefs, pillowType: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-white/10 bg-black/20 text-neutral-200 focus:border-amber-500/50 focus:outline-none"
              >
                <option value="">Select Pillow Type</option>
                <option value="Feather">Feather (Soft)</option>
                <option value="Memory Foam">Memory Foam (Firm)</option>
                <option value="Down Alternative">Down Alternative</option>
                <option value="Ortho">Orthopedic</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                Dietary Requirements
              </label>
              <input
                type="text"
                value={prefs.dietaryRestrictions?.join(", ") || ""}
                onChange={(e) =>
                  setPrefs({
                    ...prefs,
                    dietaryRestrictions: e.target.value ? e.target.value.split(",").map((s) => s.trim()) : [],
                  })
                }
                placeholder="Vegan, Gluten-Free, Nut allergy (comma separated)"
                className="w-full text-xs px-3 py-2 rounded-lg border border-white/10 bg-black/20 text-neutral-200 placeholder-neutral-500 focus:border-amber-500/50 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                Minibar Preferences
              </label>
              <input
                type="text"
                value={prefs.minibarPreferences?.join(", ") || ""}
                onChange={(e) =>
                  setPrefs({
                    ...prefs,
                    minibarPreferences: e.target.value ? e.target.value.split(",").map((s) => s.trim()) : [],
                  })
                }
                placeholder="Sparkling Water, Extra Snacks, No Alcohol"
                className="w-full text-xs px-3 py-2 rounded-lg border border-white/10 bg-black/20 text-neutral-200 placeholder-neutral-500 focus:border-amber-500/50 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={prefsLoading}
              className="w-full text-xs font-bold py-2 rounded-lg bg-neutral-200 text-black hover:bg-neutral-100 disabled:bg-neutral-800 disabled:text-neutral-500 flex items-center justify-center gap-1.5 transition-all"
            >
              {prefsLoading && <Loader2 className="h-3 w-3 animate-spin" />}
              {prefsSuccess ? "Saved Successfully!" : "Save Preferences"}
            </button>
          </form>
        )}

        {/* Loyalty Tab */}
        {activeTab === "loyalty" && (
          <div className="space-y-3">
            <LoyaltyBadge bookingCount={guest.bookingCount || 0} />
          </div>
        )}

      </div>
    </div>
  );
}
