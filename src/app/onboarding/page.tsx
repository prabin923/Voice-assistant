"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight, ArrowLeft, Check, Hotel, Phone,
  Plus, Trash2, CheckCircle2, Loader2, Copy,
  ExternalLink, Clock, Utensils,
} from "lucide-react";
import { fetchJsonWithAuth } from "@/lib/clientAuth";
import { vapiInputCls, vapiLabelCls, vapiCardCls, vapiGhostBtn } from "@/lib/vapiUi";
import { SiteShellBackdrop } from "@/components/SiteShellBackdrop";

interface RoomType {
  name: string;
  pricePerNight: number;
  currency: string;
  description: string;
  maxOccupancy: number;
}

interface HotelConfig {
  branding: { hotelName: string; tagline: string; accentColor: string; welcomeMessage: string; farewellMessage: string };
  contact: { phone: string; email: string; address: string; city: string; country: string; website?: string };
  policies: { checkInTime: string; checkOutTime: string; cancellationPolicy: string; petPolicy: string; smokingPolicy: string; extraBedPolicy: string; childPolicy: string };
  rooms: RoomType[];
  dining: { name: string; cuisine: string; hours: string; description: string }[];
  amenities: { name: string; description: string; hours?: string }[];
  customFAQ: { question: string; answer: string }[];
  receptionistPersona: string;
  voiceStyle?: string;
  language: string;
}

const ACCENT_PRESETS = [
  { name: "Gold", hex: "#c9a227" },
  { name: "Blue", hex: "#3b82f6" },
  { name: "Teal", hex: "#14b8a6" },
  { name: "Ember", hex: "#f97316" },
  { name: "Violet", hex: "#8b5cf6" },
  { name: "Emerald", hex: "#10b981" },
];

const STEPS = [
  { id: "identity", label: "Hotel Identity", icon: <Hotel className="w-4 h-4" /> },
  { id: "rooms", label: "Rooms", icon: <Hotel className="w-4 h-4" /> },
  { id: "policies", label: "Policies", icon: <Clock className="w-4 h-4" /> },
  { id: "dining", label: "Dining", icon: <Utensils className="w-4 h-4" /> },
  { id: "go-live", label: "Go Live", icon: <CheckCircle2 className="w-4 h-4" /> },
];

const DEFAULT_CONFIG: HotelConfig = {
  branding: {
    hotelName: "",
    tagline: "",
    accentColor: "#c9a227",
    welcomeMessage: "Welcome! How can I assist you with your stay?",
    farewellMessage: "Thank you for choosing us. Have a wonderful day!",
  },
  contact: { phone: "", email: "", address: "", city: "", country: "", website: "" },
  policies: {
    checkInTime: "3:00 PM",
    checkOutTime: "11:00 AM",
    cancellationPolicy: "Free cancellation up to 24 hours before check-in.",
    petPolicy: "Pets are not allowed.",
    smokingPolicy: "All indoor areas are non-smoking.",
    extraBedPolicy: "Extra beds are available upon request.",
    childPolicy: "Children under 12 stay free when using existing bedding.",
  },
  rooms: [{ name: "", pricePerNight: 0, currency: "USD", description: "", maxOccupancy: 2 }],
  dining: [],
  amenities: [],
  customFAQ: [],
  receptionistPersona:
    "You are a warm, helpful AI concierge. You know everything about this hotel and can complete room bookings and restaurant reservations without transferring to staff.",
  voiceStyle: "warm",
  language: "en-US",
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<HotelConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [embedInfo, setEmbedInfo] = useState<{ slug: string; snippet: string; embedUrl: string } | null>(null);
  const [slugDraft, setSlugDraft] = useState("");
  const [slugSaving, setSlugSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loadedExisting, setLoadedExisting] = useState(false);

  const inputCls = vapiInputCls;
  const labelCls = vapiLabelCls;
  const cardCls = vapiCardCls;

  useEffect(() => {
    void fetch("/api/auth/csrf", { credentials: "include" });
    fetchJsonWithAuth<HotelConfig>("/api/config")
      .then((existing) => {
        if (existing?.branding?.hotelName) {
          setConfig(existing);
          setLoadedExisting(true);
        }
      })
      .catch(() => {});
    fetchJsonWithAuth<{ slug: string; snippet: string; embedUrl: string }>("/api/hotel/embed")
      .then((data) => {
        setEmbedInfo(data);
        setSlugDraft(data.slug);
      })
      .catch(() => {});
  }, []);

  const updateBranding = (key: string, value: string) =>
    setConfig((prev) => ({ ...prev, branding: { ...prev.branding, [key]: value } }));

  const updateContact = (key: string, value: string) =>
    setConfig((prev) => ({ ...prev, contact: { ...prev.contact, [key]: value } }));

  const updatePolicy = (key: string, value: string) =>
    setConfig((prev) => ({ ...prev, policies: { ...prev.policies, [key]: value } }));

  const updateRoom = (i: number, key: string, value: string | number) =>
    setConfig((prev) => {
      const rooms = [...prev.rooms];
      rooms[i] = { ...rooms[i], [key]: value };
      return { ...prev, rooms };
    });

  const addRoom = () =>
    setConfig((prev) => ({
      ...prev,
      rooms: [...prev.rooms, { name: "", pricePerNight: 0, currency: "USD", description: "", maxOccupancy: 2 }],
    }));

  const removeRoom = (i: number) =>
    setConfig((prev) => ({ ...prev, rooms: prev.rooms.filter((_, j) => j !== i) }));

  const updateDining = (i: number, key: string, value: string) =>
    setConfig((prev) => {
      const dining = [...prev.dining];
      dining[i] = { ...dining[i], [key]: value };
      return { ...prev, dining };
    });

  const addDining = () =>
    setConfig((prev) => ({
      ...prev,
      dining: [...prev.dining, { name: "", cuisine: "", hours: "", description: "" }],
    }));

  const removeDining = (i: number) =>
    setConfig((prev) => ({ ...prev, dining: prev.dining.filter((_, j) => j !== i) }));

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveError("");
    try {
      await fetchJsonWithAuth("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      setSaved(true);
      // Auto-generate slug if none yet
      const embedData = await fetchJsonWithAuth<{ slug: string; snippet: string; embedUrl: string }>("/api/hotel/embed");
      setEmbedInfo(embedData);
      setSlugDraft(embedData.slug);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [config]);

  const handleSaveSlug = async () => {
    if (!slugDraft.trim()) return;
    setSlugSaving(true);
    try {
      const data = await fetchJsonWithAuth<{ slug: string; snippet: string; embedUrl: string }>("/api/hotel/embed", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: slugDraft }),
      });
      setEmbedInfo(data);
      setSlugDraft(data.slug);
    } catch {
      /* slug errors shown inline */
    } finally {
      setSlugSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!embedInfo?.snippet) return;
    try {
      await navigator.clipboard.writeText(embedInfo.snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const canGoNext = (): boolean => {
    if (step === 0) return Boolean(config.branding.hotelName.trim() && config.contact.city.trim());
    if (step === 1) return config.rooms.length > 0 && config.rooms.every((r) => r.name.trim());
    return true;
  };

  const goNext = () => {
    if (step === STEPS.length - 2) {
      void handleSave().then(() => setStep(STEPS.length - 1));
    } else {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }
  };

  const goPrev = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className="relative min-h-screen overflow-hidden bg-void-canvas text-cream-text">
      <SiteShellBackdrop />
      <div className="relative z-10">
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-iron-border bg-carbon-surface/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3 sm:px-6">
            <Link href="/" className="text-sm font-semibold text-cream-text">STAYNEP</Link>
            <div className="flex items-center gap-3">
              {loadedExisting && (
                <span className="text-xs text-zinc-mute">Continuing existing config</span>
              )}
              <Link href="/settings" className={vapiGhostBtn + " text-xs"}>
                Skip to Settings
              </Link>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
          {/* Progress steps */}
          <div className="mb-8">
            <div className="flex items-center gap-1">
              {STEPS.map((s, i) => (
                <div key={s.id} className="flex flex-1 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => i < step && setStep(i)}
                    disabled={i >= step}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                      i < step
                        ? "border-mint-pulse bg-mint-pulse/10 text-mint-pulse cursor-pointer hover:bg-mint-pulse/20"
                        : i === step
                          ? "border-ember-orange bg-ember-orange/10 text-ember-orange"
                          : "border-iron-border bg-carbon-surface text-zinc-mute"
                    }`}
                    aria-label={`Go to step: ${s.label}`}
                  >
                    {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className={`h-px flex-1 transition-colors ${i < step ? "bg-mint-pulse/40" : "bg-iron-border"}`} />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between px-0">
              {STEPS.map((s, i) => (
                <span
                  key={s.id}
                  className={`text-[10px] font-medium ${i === step ? "text-cream-text" : "text-zinc-mute"}`}
                  style={{ width: `${100 / STEPS.length}%`, textAlign: i === 0 ? "left" : i === STEPS.length - 1 ? "right" : "center" }}
                >
                  {s.label}
                </span>
              ))}
            </div>
          </div>

          {/* ── Step 0: Hotel Identity ── */}
          {step === 0 && (
            <div className={cardCls}>
              <div>
                <h2 className="text-lg font-semibold text-cream-text">Hotel identity</h2>
                <p className="text-sm text-zinc-mute">This is how your hotel appears to guests.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelCls}>Hotel name <span className="text-ember-orange">*</span></label>
                  <input
                    className={inputCls}
                    value={config.branding.hotelName}
                    onChange={(e) => updateBranding("hotelName", e.target.value)}
                    placeholder="The Grand Hotel"
                    autoFocus
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Tagline</label>
                  <input
                    className={inputCls}
                    value={config.branding.tagline}
                    onChange={(e) => updateBranding("tagline", e.target.value)}
                    placeholder="Where elegance meets comfort"
                  />
                </div>
                <div>
                  <label className={labelCls}>City <span className="text-ember-orange">*</span></label>
                  <input
                    className={inputCls}
                    value={config.contact.city}
                    onChange={(e) => updateContact("city", e.target.value)}
                    placeholder="Kathmandu"
                  />
                </div>
                <div>
                  <label className={labelCls}>Country</label>
                  <input
                    className={inputCls}
                    value={config.contact.country}
                    onChange={(e) => updateContact("country", e.target.value)}
                    placeholder="Nepal"
                  />
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <input
                    className={inputCls}
                    value={config.contact.phone}
                    onChange={(e) => updateContact("phone", e.target.value)}
                    placeholder="+977 1 000 0000"
                  />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input
                    className={inputCls}
                    type="email"
                    value={config.contact.email}
                    onChange={(e) => updateContact("email", e.target.value)}
                    placeholder="reservations@hotel.com"
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Brand accent color</label>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {ACCENT_PRESETS.map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => updateBranding("accentColor", preset.hex)}
                      title={preset.name}
                      className={`relative h-8 w-8 rounded-xl border-2 transition-transform hover:scale-110 active:scale-95 ${
                        config.branding.accentColor.toLowerCase() === preset.hex.toLowerCase()
                          ? "border-white/60 scale-110"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: preset.hex }}
                    >
                      {config.branding.accentColor.toLowerCase() === preset.hex.toLowerCase() && (
                        <Check className="absolute inset-0 m-auto w-3.5 h-3.5 text-white drop-shadow" />
                      )}
                    </button>
                  ))}
                  <input
                    type="color"
                    value={config.branding.accentColor}
                    onChange={(e) => updateBranding("accentColor", e.target.value)}
                    className="h-8 w-8 cursor-pointer rounded-xl border-2 border-iron-border bg-transparent p-0.5"
                    title="Custom color"
                  />
                  <span className="text-xs text-zinc-mute font-mono">{config.branding.accentColor}</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 1: Rooms ── */}
          {step === 1 && (
            <div className={cardCls}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-cream-text">Room types</h2>
                  <p className="text-sm text-zinc-mute">Add at least one room type with pricing.</p>
                </div>
                <button
                  type="button"
                  onClick={addRoom}
                  className={vapiGhostBtn + " text-xs"}
                  disabled={config.rooms.length >= 8}
                >
                  <Plus className="w-3.5 h-3.5" /> Add room
                </button>
              </div>

              {config.rooms.map((room, i) => (
                <div key={i} className="rounded-[5.6px] border border-iron-border bg-slab-elevated p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-widest text-zinc-mute">Room {i + 1}</span>
                    {config.rooms.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRoom(i)}
                        className="text-red-400/60 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className={labelCls}>Room name <span className="text-ember-orange">*</span></label>
                      <input
                        className={inputCls}
                        value={room.name}
                        onChange={(e) => updateRoom(i, "name", e.target.value)}
                        placeholder="Deluxe King Room"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Price / night</label>
                      <input
                        type="number"
                        className={inputCls}
                        value={room.pricePerNight || ""}
                        onChange={(e) => updateRoom(i, "pricePerNight", Number(e.target.value))}
                        placeholder="120"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Currency</label>
                      <input
                        className={inputCls}
                        value={room.currency}
                        onChange={(e) => updateRoom(i, "currency", e.target.value)}
                        placeholder="USD"
                        maxLength={5}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Max occupancy</label>
                      <input
                        type="number"
                        className={inputCls}
                        value={room.maxOccupancy}
                        onChange={(e) => updateRoom(i, "maxOccupancy", Number(e.target.value))}
                        min={1}
                        max={10}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelCls}>Description</label>
                      <input
                        className={inputCls}
                        value={room.description}
                        onChange={(e) => updateRoom(i, "description", e.target.value)}
                        placeholder="Spacious room with mountain views and king-size bed"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Step 2: Policies ── */}
          {step === 2 && (
            <div className={cardCls}>
              <div>
                <h2 className="text-lg font-semibold text-cream-text">Hotel policies</h2>
                <p className="text-sm text-zinc-mute">The AI receptionist shares these with guests automatically.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Check-in time</label>
                  <input
                    className={inputCls}
                    value={config.policies.checkInTime}
                    onChange={(e) => updatePolicy("checkInTime", e.target.value)}
                    placeholder="3:00 PM"
                  />
                </div>
                <div>
                  <label className={labelCls}>Check-out time</label>
                  <input
                    className={inputCls}
                    value={config.policies.checkOutTime}
                    onChange={(e) => updatePolicy("checkOutTime", e.target.value)}
                    placeholder="11:00 AM"
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Cancellation policy</label>
                <textarea
                  className={inputCls + " h-20 resize-none"}
                  value={config.policies.cancellationPolicy}
                  onChange={(e) => updatePolicy("cancellationPolicy", e.target.value)}
                  placeholder="Free cancellation up to 24 hours before check-in..."
                />
              </div>
              <div>
                <label className={labelCls}>Pet policy</label>
                <input
                  className={inputCls}
                  value={config.policies.petPolicy}
                  onChange={(e) => updatePolicy("petPolicy", e.target.value)}
                  placeholder="Pets are welcome with a deposit..."
                />
              </div>
              <div>
                <label className={labelCls}>Smoking policy</label>
                <input
                  className={inputCls}
                  value={config.policies.smokingPolicy}
                  onChange={(e) => updatePolicy("smokingPolicy", e.target.value)}
                  placeholder="Non-smoking property..."
                />
              </div>
              <div>
                <label className={labelCls}>Child policy</label>
                <input
                  className={inputCls}
                  value={config.policies.childPolicy}
                  onChange={(e) => updatePolicy("childPolicy", e.target.value)}
                  placeholder="Children under 12 stay free..."
                />
              </div>
            </div>
          )}

          {/* ── Step 3: Dining ── */}
          {step === 3 && (
            <div className={cardCls}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-cream-text">Dining venues</h2>
                  <p className="text-sm text-zinc-mute">Optional — add restaurants or bars at your hotel. You can skip this and add them later in Settings.</p>
                </div>
                <button
                  type="button"
                  onClick={addDining}
                  className={vapiGhostBtn + " text-xs"}
                  disabled={config.dining.length >= 6}
                >
                  <Plus className="w-3.5 h-3.5" /> Add venue
                </button>
              </div>

              {config.dining.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <Utensils className="w-8 h-8 text-zinc-mute/50" />
                  <p className="text-sm text-zinc-mute">No dining venues yet. Add one above or skip to the next step.</p>
                </div>
              ) : (
                config.dining.map((venue, i) => (
                  <div key={i} className="rounded-[5.6px] border border-iron-border bg-slab-elevated p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-widest text-zinc-mute">Venue {i + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeDining(i)}
                        className="text-red-400/60 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className={labelCls}>Venue name</label>
                        <input
                          className={inputCls}
                          value={venue.name}
                          onChange={(e) => updateDining(i, "name", e.target.value)}
                          placeholder="The Garden Restaurant"
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Cuisine</label>
                        <input
                          className={inputCls}
                          value={venue.cuisine}
                          onChange={(e) => updateDining(i, "cuisine", e.target.value)}
                          placeholder="Continental"
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Hours</label>
                        <input
                          className={inputCls}
                          value={venue.hours}
                          onChange={(e) => updateDining(i, "hours", e.target.value)}
                          placeholder="7:00 AM – 10:00 PM"
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Description</label>
                        <input
                          className={inputCls}
                          value={venue.description}
                          onChange={(e) => updateDining(i, "description", e.target.value)}
                          placeholder="Rooftop dining with panoramic views"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Step 4: Go Live ── */}
          {step === 4 && (
            <div className="space-y-5">
              {!saved ? (
                <div className={cardCls}>
                  <div className="text-center space-y-3 py-4">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-iron-border bg-slab-elevated">
                      <CheckCircle2 className="w-8 h-8 text-zinc-mute" />
                    </div>
                    <h2 className="text-lg font-semibold text-cream-text">Ready to go live</h2>
                    <p className="text-sm text-zinc-mute max-w-sm mx-auto">
                      Your hotel configuration is ready. Save it to generate your embed code and live preview.
                    </p>
                    {saveError && (
                      <p className="text-sm text-red-400">{saveError}</p>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleSave()}
                      disabled={saving}
                      className="vapi-btn-ember mx-auto gap-2 disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      {saving ? "Saving…" : "Save & generate embed code"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Success banner */}
                  <div className="flex items-center gap-3 rounded-[5.6px] border border-mint-pulse/30 bg-mint-pulse/10 px-4 py-3 text-sm text-mint-pulse">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <div>
                      <p className="font-semibold">Your hotel is configured!</p>
                      <p className="text-xs opacity-80">Your AI receptionist is ready to accept guests.</p>
                    </div>
                  </div>

                  {/* Slug editor */}
                  <div className={cardCls}>
                    <div>
                      <h3 className="text-base font-semibold text-cream-text">Your embed URL</h3>
                      <p className="text-sm text-zinc-mute">Customize the slug that appears in your embed link.</p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        className={inputCls}
                        value={slugDraft}
                        onChange={(e) => setSlugDraft(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                        placeholder="your-hotel-name"
                      />
                      <button
                        type="button"
                        onClick={() => void handleSaveSlug()}
                        disabled={slugSaving || !slugDraft.trim()}
                        className="vapi-btn-ember vapi-btn-compact shrink-0"
                      >
                        {slugSaving ? "Saving…" : "Update slug"}
                      </button>
                    </div>
                    {embedInfo?.embedUrl && (
                      <p className="text-xs text-zinc-mute">
                        Direct link:{" "}
                        <a href={embedInfo.embedUrl} target="_blank" rel="noreferrer" className="text-ember-orange underline underline-offset-2">
                          {embedInfo.embedUrl}
                        </a>
                      </p>
                    )}
                  </div>

                  {/* Embed code */}
                  {embedInfo?.snippet && (
                    <div className={cardCls}>
                      <div>
                        <h3 className="text-base font-semibold text-cream-text">Embed code</h3>
                        <p className="text-sm text-zinc-mute">Paste this in your hotel website before <code className="rounded bg-neutral-800 px-1 text-amber-300">&lt;/body&gt;</code>.</p>
                      </div>
                      <div className="relative">
                        <pre className="overflow-x-auto rounded-[5.6px] border border-neutral-800 bg-neutral-950/80 p-4 pr-16 text-xs leading-relaxed text-neutral-300">
                          {embedInfo.snippet}
                        </pre>
                        <button
                          type="button"
                          onClick={() => void handleCopy()}
                          className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-md border border-neutral-700 bg-neutral-900 px-2.5 py-1.5 text-[11px] font-medium text-neutral-200 transition-colors hover:border-neutral-500 hover:text-white"
                        >
                          {copied ? <Check className="h-3 w-3 text-mint-pulse" /> : <Copy className="h-3 w-3" />}
                          {copied ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Live preview */}
                  {embedInfo?.embedUrl && (
                    <div className={cardCls}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold text-cream-text">Live preview</h3>
                          <p className="text-sm text-zinc-mute">This is what guests will see.</p>
                        </div>
                        <a
                          href={embedInfo.embedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={vapiGhostBtn + " shrink-0 text-xs"}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Full screen</span>
                        </a>
                      </div>
                      <div className="overflow-hidden rounded-[5.6px] border border-iron-border">
                        <iframe
                          key={embedInfo.embedUrl}
                          src={embedInfo.embedUrl}
                          title="Voice concierge preview"
                          allow="microphone"
                          className="h-[560px] w-full border-0 bg-void-canvas"
                        />
                      </div>
                    </div>
                  )}

                  {/* Next actions */}
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Link
                      href="/settings"
                      className="vapi-btn-ember flex-1 justify-center"
                    >
                      <Hotel className="w-4 h-4" />
                      Open full settings
                    </Link>
                    <Link
                      href="/assistant"
                      className={vapiGhostBtn + " flex-1 justify-center"}
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open assistant
                    </Link>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Navigation */}
          {step < STEPS.length - 1 && (
            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={goPrev}
                disabled={step === 0}
                className={vapiGhostBtn + " disabled:opacity-30"}
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={!canGoNext() || saving}
                className="vapi-btn-ember disabled:opacity-40"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                  </>
                ) : step === STEPS.length - 2 ? (
                  <>
                    Save & go live <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Continue <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {step === STEPS.length - 1 && !saved && (
            <div className="mt-6 flex justify-start">
              <button
                type="button"
                onClick={goPrev}
                className={vapiGhostBtn}
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
