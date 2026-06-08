"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Settings, Hotel, Phone, Clock, Utensils, Dumbbell,
  Save, RotateCcw, Plus, Trash2, ChevronLeft, CheckCircle2,
  AlertCircle, MessageSquare, LogOut, User, BarChart3, Inbox, X,
  Crown, Sparkles, Bell, CalendarDays, CalendarCheck,
} from "lucide-react";
import { fetchJsonWithAuth, isUnauthorizedError } from "@/lib/clientAuth";
import { applyHotelBrandTheme, notifyHotelConfigUpdated, syncBrandingOnHotelRename } from "@/lib/hotelBrand";
import { SiteShellBackdrop, siteHeaderChrome } from "@/components/SiteShellBackdrop";
import { StaffNotificationCenter } from "@/components/StaffNotificationCenter";
import { CalendarInventoryCenter } from "@/components/CalendarInventoryCenter";
import { BookingsCenter } from "@/components/BookingsCenter";
import { vapiCardCls, vapiGhostBtn, vapiInputCls, vapiLabelCls, vapiTabActive, vapiTabIdle } from "@/lib/vapiUi";

interface RoomType {
  name: string;
  pricePerNight: number;
  currency: string;
  description: string;
  maxOccupancy: number;
  category?: string;
  imageUrl?: string;
}
interface DiningVenue { name: string; cuisine: string; hours: string; description: string; }
interface Amenity { name: string; description: string; hours?: string; }
interface FAQ { question: string; answer: string; }

interface HotelConfig {
  branding: { hotelName: string; tagline: string; accentColor: string; welcomeMessage: string; farewellMessage: string; logoUrl?: string; };
  contact: { phone: string; email: string; website?: string; address: string; city: string; country: string; };
  policies: { checkInTime: string; checkOutTime: string; cancellationPolicy: string; petPolicy: string; smokingPolicy: string; extraBedPolicy: string; childPolicy: string; };
  rooms: RoomType[];
  dining: DiningVenue[];
  amenities: Amenity[];
  customFAQ: FAQ[];
  receptionistPersona: string;
  voiceStyle?: "warm" | "professional" | "energetic";
  language: string;
  telephony?: {
    webhookUrl: string;
    enabled: boolean;
    provider: "generic" | "twilio" | "telnyx";
    telnyxVoice?: string;
    telnyxPhoneNumber?: string;
  };
}

type Tab = "notifications" | "calendar" | "bookings" | "branding" | "contact" | "policies" | "rooms" | "dining" | "amenities" | "faq" | "persona" | "telephony";

export default function SettingsPage() {
  const [config, setConfig] = useState<HotelConfig | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("branding");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [hotelUser, setHotelUser] = useState<{ name: string; email: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "delete" | "info" } | null>(null);
  const [loadError, setLoadError] = useState("");
  const [openHandoffCount, setOpenHandoffCount] = useState(0);
  const [knowledgeGaps, setKnowledgeGaps] = useState<
    { id: string; question: string; guest_message: string; language: string; status: string; created_at: string }[]
  >([]);

  const showToast = useCallback((message: string, type: "success" | "delete" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadProtectedData = useCallback(() => {
    setLoadError("");
    fetchJsonWithAuth<HotelConfig>("/api/config")
      .then(setConfig)
      .catch((err: unknown) => {
        if (!isUnauthorizedError(err)) {
          setLoadError("Failed to load settings. Please try again.");
        }
      });

    fetchJsonWithAuth<{ name?: string; email?: string }>("/api/auth/me")
      .then((data) => {
        if (data.name && data.email) setHotelUser({ name: data.name, email: data.email });
      })
      .catch(() => {});

    fetchJsonWithAuth<{ openCount: number }>("/api/support?status=open")
      .then((data) => setOpenHandoffCount(data.openCount))
      .catch(() => {});

    fetchJsonWithAuth<{ gaps: typeof knowledgeGaps }>("/api/knowledge-gaps")
      .then((data) => setKnowledgeGaps(data.gaps ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadProtectedData();
  }, [loadProtectedData]);

  useEffect(() => {
    if (config?.branding) applyHotelBrandTheme(config.branding);
  }, [config?.branding]);

  const handleLogout = async () => {
    await fetchJsonWithAuth<{ success: boolean }>("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };

  const save = async () => {
    if (!config) return;
    setSaving(true);
    setSaveStatus("idle");
    try {
      await fetchJsonWithAuth<{ success: boolean; config: HotelConfig }>("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      setSaveStatus("success");
      notifyHotelConfigUpdated();
    } catch { setSaveStatus("error"); }
    finally { setSaving(false); setTimeout(() => setSaveStatus("idle"), 3000); }
  };

  const reset = async () => {
    try {
      const data = await fetchJsonWithAuth<{ config?: HotelConfig }>("/api/config", { method: "DELETE" });
      if (data.config) setConfig(data.config);
      notifyHotelConfigUpdated();
    } catch {
      // Redirect is handled by shared auth helper on 401.
    }
  };

  if (!config) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-void-canvas">
        {loadError ? (
          <div className="space-y-4 px-4 text-center">
            <p className="text-sm text-red-400">{loadError}</p>
            <button type="button" onClick={loadProtectedData} className="vapi-btn-ember vapi-btn-compact">
              Retry
            </button>
          </div>
        ) : (
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-ember-orange border-t-transparent" />
        )}
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" />, badge: openHandoffCount },
    { id: "calendar", label: "Calendar", icon: <CalendarDays className="w-4 h-4" /> },
    { id: "bookings", label: "Bookings", icon: <CalendarCheck className="w-4 h-4" /> },
    { id: "branding", label: "Branding", icon: <Hotel className="w-4 h-4" /> },
    { id: "contact", label: "Contact", icon: <Phone className="w-4 h-4" /> },
    { id: "policies", label: "Policies", icon: <Clock className="w-4 h-4" /> },
    { id: "rooms", label: "Rooms", icon: <Hotel className="w-4 h-4" /> },
    { id: "dining", label: "Dining", icon: <Utensils className="w-4 h-4" /> },
    { id: "amenities", label: "Amenities", icon: <Dumbbell className="w-4 h-4" /> },
    { id: "faq", label: "Custom FAQ", icon: <MessageSquare className="w-4 h-4" /> },
    { id: "persona", label: "AI Persona", icon: <Settings className="w-4 h-4" /> },
    { id: "telephony", label: "Telnyx Voice", icon: <Phone className="w-4 h-4" /> },
  ];
  const isDark = true;

  const inputCls = vapiInputCls;
  const labelCls = vapiLabelCls;
  const cardCls = vapiCardCls;

  // Helper to update nested config
  const updateBranding = (key: string, value: string) => {
    setConfig((prev) => {
      if (!prev) return prev;
      if (key === "hotelName") {
        return {
          ...prev,
          branding: syncBrandingOnHotelRename(prev.branding.hotelName, value, prev.branding),
        };
      }
      return { ...prev, branding: { ...prev.branding, [key]: value } };
    });
  };
  const updateContact = (key: string, value: string) => setConfig({ ...config, contact: { ...config.contact, [key]: value } });
  const updatePolicy = (key: string, value: string) => setConfig({ ...config, policies: { ...config.policies, [key]: value } });

  return (
    <div className="relative min-h-screen overflow-hidden bg-void-canvas text-cream-text">
      <SiteShellBackdrop />
      <div className="relative z-10">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-2 fade-in">
          <div className={`flex items-center gap-3 rounded-[5.6px] border px-5 py-3 text-sm font-medium ${
            toast.type === "success" ? "border-mint-pulse/30 bg-mint-pulse/10 text-mint-pulse" :
            toast.type === "delete" ? "border-red-500/30 bg-red-500/10 text-red-300" :
            "border-ice-border/30 bg-slab-elevated text-bone-text"
          }`}>
            {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> :
             toast.type === "delete" ? <Trash2 className="w-4 h-4" /> :
             <AlertCircle className="w-4 h-4" />}
            {toast.message}
            <button onClick={() => setToast(null)} className="ml-2 opacity-50 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={`sticky top-0 z-20 border-b ${siteHeaderChrome()}`}>
        <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <Link href="/assistant" className="vapi-nav-label inline-flex items-center gap-2 text-zinc-mute hover:text-cream-text">
              <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
              <span className="normal-case tracking-normal font-sans text-sm">Back</span>
            </Link>
            <div className="hidden h-6 w-px bg-iron-border sm:block" />
            <Link href="/" className="text-sm font-semibold text-cream-text">STAYNEP</Link>
            <div className="hidden h-6 w-px bg-iron-border sm:block" />
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-ice-border" strokeWidth={1.5} />
              <h1 className="text-sm font-medium text-cream-text">Hotel configuration</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hotelUser && (
              <div className={`flex items-center gap-2 rounded-[5.6px] border border-iron-border bg-carbon-surface px-3 py-1.5 text-sm text-zinc-mute`}>
                <User className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>{hotelUser.name}</span>
              </div>
            )}
            <Link href="/admin/support" className={`${vapiGhostBtn} relative text-xs`}>
              <Inbox className="w-4 h-4" strokeWidth={1.5} /><span className="hidden sm:inline">Support</span>
              {openHandoffCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-ember-orange px-1 text-[10px] font-bold text-void-canvas">
                  {openHandoffCount > 9 ? "9+" : openHandoffCount}
                </span>
              )}
            </Link>
            <Link href="/admin/analytics" className={`${vapiGhostBtn} text-xs`}>
              <BarChart3 className="w-4 h-4" strokeWidth={1.5} /><span className="hidden sm:inline">Analytics</span>
            </Link>
            {saveStatus === "success" && (
              <span className="flex items-center gap-1.5 text-sm text-mint-pulse animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" /> Saved
              </span>
            )}
            {saveStatus === "error" && (
              <span className="flex items-center gap-1.5 text-sm text-red-400">
                <AlertCircle className="w-4 h-4" /> Error saving
              </span>
            )}
            <button type="button" onClick={reset} className={vapiGhostBtn}>
              <RotateCcw className="w-4 h-4" strokeWidth={1.5} /> Reset
            </button>
            <button type="button" onClick={save} disabled={saving} className="vapi-btn-ember vapi-btn-compact disabled:opacity-50">
              <Save className="w-4 h-4" strokeWidth={1.5} /> {saving ? "Saving..." : "Save"}
            </button>
            <button type="button" onClick={handleLogout} className={`${vapiGhostBtn} hover:border-red-500/40 hover:text-red-300`}>
              <LogOut className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-6 sm:flex-row sm:gap-8 sm:px-6 sm:py-8">
        {/* Sidebar Tabs */}
        <aside className="shrink-0 sm:w-56">
          <nav className="scrollbar-premium flex gap-1 overflow-x-auto pb-2 sm:flex-col sm:overflow-visible sm:pb-0 sm:sticky sm:top-24">
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center gap-3 rounded-[5.6px] border px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === tab.id ? vapiTabActive : vapiTabIdle
                }`}
              >
                {tab.icon}
                <span className="flex-1 text-left">{tab.label}</span>
                {tab.badge != null && tab.badge > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-ember-orange px-1.5 text-[10px] font-bold text-void-canvas">
                    {tab.badge > 9 ? "9+" : tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {activeTab === "notifications" && (
            <StaffNotificationCenter
              isDark={isDark}
              cardCls={cardCls}
              inputCls={inputCls}
              labelCls={labelCls}
              onToast={showToast}
              onOpenCountChange={setOpenHandoffCount}
            />
          )}

          {activeTab === "calendar" && (
            <CalendarInventoryCenter
              rooms={config.rooms}
              isDark={isDark}
              cardCls={cardCls}
              inputCls={inputCls}
              labelCls={labelCls}
              onToast={showToast}
            />
          )}

          {activeTab === "bookings" && (
            <BookingsCenter
              isDark={isDark}
              cardCls={cardCls}
              labelCls={labelCls}
              onToast={showToast}
            />
          )}

          {/* BRANDING — PREMIUM */}
          {activeTab === "branding" && (
            <div className="space-y-6">
              {/* Hotel Identity Card */}
              <div className={cardCls}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2"><Hotel className="w-5 h-5 text-[#163a5f] dark:text-[#e4c449]" /> Hotel Identity</h2>
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 text-amber-400">
                    <Crown className="w-3 h-3" /> Premium
                  </span>
                </div>
                <p className="text-neutral-500 text-sm">Configure how your hotel appears to guests across all touchpoints.</p>
                <div className="grid grid-cols-2 gap-5">
                  <div><label className={labelCls}>Hotel Name</label><input className={inputCls} value={config.branding.hotelName} onChange={e => updateBranding("hotelName", e.target.value)} /></div>
                  <div><label className={labelCls}>Tagline</label><input className={inputCls} value={config.branding.tagline} onChange={e => updateBranding("tagline", e.target.value)} /></div>
                  <div className="col-span-2"><label className={labelCls}>Logo URL (optional)</label><input className={inputCls} value={config.branding.logoUrl || ""} onChange={e => updateBranding("logoUrl", e.target.value)} placeholder="https://your-hotel.com/logo.png" /></div>
                </div>
              </div>

              {/* Accent Color — Premium Selector */}
              <div className={cardCls}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-400" /> Brand Color</h2>
                </div>
                <p className="text-neutral-500 text-sm">Choose a signature color that defines your hotel&apos;s visual identity.</p>

                {/* Active Color Display */}
                <div className="relative rounded-2xl overflow-hidden border border-neutral-800/60 bg-neutral-800/20 p-5">
                  {/* Glow behind swatch */}
                  <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ backgroundColor: config.branding.accentColor }} />
                  <div className="relative flex items-center gap-5">
                    <div className="relative group shrink-0">
                      <input
                        type="color"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        value={config.branding.accentColor}
                        onChange={e => updateBranding("accentColor", e.target.value)}
                      />
                      <div
                        className="w-16 h-16 rounded-2xl border-2 border-white/10 shadow-2xl transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] group-active:scale-95"
                        style={{ backgroundColor: config.branding.accentColor }}
                      />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center">
                        <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <input
                          className={inputCls + " font-mono uppercase tracking-wider"}
                          value={config.branding.accentColor}
                          onChange={e => updateBranding("accentColor", e.target.value)}
                          placeholder="#000000"
                        />
                      </div>
                      <p className="text-[11px] text-neutral-500">Click the color swatch or type a hex code. Pick from curated palettes below.</p>
                    </div>
                  </div>
                </div>

                {/* Curated Palettes */}
                {[
                  {
                    label: "Warm",
                    colors: [
                      { name: "Gold", hex: "#c9a227" },
                      { name: "Pink", hex: "#ec4899" },
                      { name: "Orange", hex: "#f97316" },
                      { name: "Amber", hex: "#f59e0b" },
                      { name: "Coral", hex: "#ff6b6b" },
                    ],
                  },
                  {
                    label: "Cool",
                    colors: [
                      { name: "Blue", hex: "#3b82f6" },
                      { name: "Cyan", hex: "#06b6d4" },
                      { name: "Teal", hex: "#14b8a6" },
                      { name: "Emerald", hex: "#10b981" },
                      { name: "Sky", hex: "#0ea5e9" },
                    ],
                  },
                  {
                    label: "Bold",
                    colors: [
                      { name: "Indigo", hex: "#6366f1" },
                      { name: "Violet", hex: "#8b5cf6" },
                      { name: "Purple", hex: "#a855f7" },
                      { name: "Fuchsia", hex: "#d946ef" },
                      { name: "Crimson", hex: "#dc2626" },
                    ],
                  },
                  {
                    label: "Luxe",
                    colors: [
                      { name: "Gold", hex: "#d4a017" },
                      { name: "Champagne", hex: "#c9a96e" },
                      { name: "Bronze", hex: "#cd7f32" },
                      { name: "Slate", hex: "#64748b" },
                      { name: "Obsidian", hex: "#1e1e2e" },
                    ],
                  },
                ].map(palette => (
                  <div key={palette.label} className="space-y-2.5">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">{palette.label}</span>
                    <div className="flex items-center gap-2">
                      {palette.colors.map(color => {
                        const isActive = config.branding.accentColor.toLowerCase() === color.hex.toLowerCase();
                        return (
                          <button
                            key={color.hex}
                            type="button"
                            onClick={() => updateBranding("accentColor", color.hex)}
                            className="group relative flex flex-col items-center gap-1.5"
                          >
                            <div
                              className={`w-10 h-10 rounded-xl border transition-all duration-200 ${
                                isActive
                                  ? "border-white/30 scale-110 shadow-lg ring-2 ring-white/20 ring-offset-2 ring-offset-neutral-900"
                                  : "border-white/5 opacity-60 hover:opacity-100 hover:scale-105 hover:border-white/10"
                              }`}
                              style={{ backgroundColor: color.hex, boxShadow: isActive ? `0 4px 20px ${color.hex}40` : undefined }}
                            >
                              {isActive && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <CheckCircle2 className="w-4 h-4 text-white drop-shadow-lg" />
                                </div>
                              )}
                            </div>
                            <span className={`text-[9px] font-medium transition-colors ${isActive ? "text-neutral-200" : "text-neutral-600 group-hover:text-neutral-400"}`}>
                              {color.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Live Preview */}
                <div className="space-y-2.5 pt-2">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">Live Preview</span>
                  <div className="rounded-2xl border border-neutral-800/60 bg-neutral-900/80 p-5 space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ backgroundColor: config.branding.accentColor }} />
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: config.branding.accentColor }}>
                        {config.branding.hotelName?.charAt(0) || "H"}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">{config.branding.hotelName || "Your Hotel"}</div>
                        <div className="text-[11px] text-neutral-500">{config.branding.tagline || "Your tagline here"}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-white" style={{ backgroundColor: config.branding.accentColor }}>
                        Book Now
                      </div>
                      <div className="px-3 py-1.5 rounded-lg text-[11px] font-medium border" style={{ borderColor: config.branding.accentColor, color: config.branding.accentColor }}>
                        Learn More
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages Card */}
              <div className={cardCls}>
                <h2 className="text-lg font-semibold flex items-center gap-2"><MessageSquare className="w-5 h-5 text-[#163a5f] dark:text-[#e4c449]" /> Guest Messages</h2>
                <p className="text-neutral-500 text-sm">Customize the messages guests see when interacting with your AI receptionist.</p>
                <div><label className={labelCls}>Welcome Message</label><textarea className={inputCls + " h-20 resize-none"} value={config.branding.welcomeMessage} onChange={e => updateBranding("welcomeMessage", e.target.value)} /></div>
                <div><label className={labelCls}>Farewell Message</label><textarea className={inputCls + " h-20 resize-none"} value={config.branding.farewellMessage} onChange={e => updateBranding("farewellMessage", e.target.value)} /></div>
              </div>
            </div>
          )}

          {/* CONTACT */}
          {activeTab === "contact" && (
            <div className={cardCls}>
              <h2 className="text-lg font-semibold flex items-center gap-2"><Phone className="w-5 h-5 text-[#163a5f] dark:text-[#e4c449]" /> Contact Information</h2>
              <p className="text-neutral-500 text-sm">This information is shared with guests when they ask for contact details.</p>
              <div className="grid grid-cols-2 gap-5">
                <div><label className={labelCls}>Phone</label><input className={inputCls} value={config.contact.phone} onChange={e => updateContact("phone", e.target.value)} /></div>
                <div><label className={labelCls}>Email</label><input className={inputCls} value={config.contact.email} onChange={e => updateContact("email", e.target.value)} /></div>
                <div><label className={labelCls}>Website</label><input className={inputCls} value={config.contact.website || ""} onChange={e => updateContact("website", e.target.value)} /></div>
                <div><label className={labelCls}>Address</label><input className={inputCls} value={config.contact.address} onChange={e => updateContact("address", e.target.value)} /></div>
                <div><label className={labelCls}>City</label><input className={inputCls} value={config.contact.city} onChange={e => updateContact("city", e.target.value)} /></div>
                <div><label className={labelCls}>Country</label><input className={inputCls} value={config.contact.country} onChange={e => updateContact("country", e.target.value)} /></div>
              </div>
            </div>
          )}

          {/* POLICIES */}
          {activeTab === "policies" && (
            <div className={cardCls}>
              <h2 className="text-lg font-semibold flex items-center gap-2"><Clock className="w-5 h-5 text-[#163a5f] dark:text-[#e4c449]" /> Hotel Policies</h2>
              <p className="text-neutral-500 text-sm">Define policies the AI receptionist will communicate to guests.</p>
              <div className="grid grid-cols-2 gap-5">
                <div><label className={labelCls}>Check-In Time</label><input className={inputCls} value={config.policies.checkInTime} onChange={e => updatePolicy("checkInTime", e.target.value)} /></div>
                <div><label className={labelCls}>Check-Out Time</label><input className={inputCls} value={config.policies.checkOutTime} onChange={e => updatePolicy("checkOutTime", e.target.value)} /></div>
              </div>
              <div><label className={labelCls}>Cancellation Policy</label><textarea className={inputCls + " h-20 resize-none"} value={config.policies.cancellationPolicy} onChange={e => updatePolicy("cancellationPolicy", e.target.value)} /></div>
              <div><label className={labelCls}>Pet Policy</label><textarea className={inputCls + " h-16 resize-none"} value={config.policies.petPolicy} onChange={e => updatePolicy("petPolicy", e.target.value)} /></div>
              <div><label className={labelCls}>Smoking Policy</label><textarea className={inputCls + " h-16 resize-none"} value={config.policies.smokingPolicy} onChange={e => updatePolicy("smokingPolicy", e.target.value)} /></div>
              <div><label className={labelCls}>Extra Bed Policy</label><textarea className={inputCls + " h-16 resize-none"} value={config.policies.extraBedPolicy} onChange={e => updatePolicy("extraBedPolicy", e.target.value)} /></div>
              <div><label className={labelCls}>Child Policy</label><textarea className={inputCls + " h-16 resize-none"} value={config.policies.childPolicy} onChange={e => updatePolicy("childPolicy", e.target.value)} /></div>
            </div>
          )}

          {/* ROOMS */}
          {activeTab === "rooms" && (
            <div className={cardCls}>
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2"><Hotel className="w-5 h-5 text-[#163a5f] dark:text-[#e4c449]" /> Room Types</h2>
                  <p className="text-neutral-500 text-sm mt-1">Define the room categories and pricing for your hotel.</p>
                </div>
                <button onClick={() => { setConfig({ ...config, rooms: [...config.rooms, { name: "", pricePerNight: 0, currency: "USD", description: "", maxOccupancy: 2 }] }); showToast("New room type added", "success"); }} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-neutral-800 border border-neutral-700 hover:border-neutral-600 text-neutral-300 hover:text-white transition-all">
                  <Plus className="w-4 h-4" /> Add Room
                </button>
              </div>
              {config.rooms.map((room, i) => (
                <div key={i} className="bg-neutral-800/30 rounded-xl p-5 border border-neutral-800/50 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-neutral-300">Room {i + 1}</span>
                    <button onClick={() => { const name = config.rooms[i].name || `Room ${i + 1}`; setConfig({ ...config, rooms: config.rooms.filter((_, j) => j !== i) }); showToast(`"${name}" removed`, "delete"); }} className="text-red-400/60 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className={labelCls}>Name</label><input className={inputCls} value={room.name} onChange={e => { const r = [...config.rooms]; r[i] = { ...r[i], name: e.target.value }; setConfig({ ...config, rooms: r }); }} /></div>
                    <div><label className={labelCls}>Category</label><input className={inputCls} value={room.category || ""} onChange={e => { const r = [...config.rooms]; r[i] = { ...r[i], category: e.target.value }; setConfig({ ...config, rooms: r }); }} /></div>
                    <div><label className={labelCls}>Price/Night</label><input type="number" className={inputCls} value={room.pricePerNight} onChange={e => { const r = [...config.rooms]; r[i] = { ...r[i], pricePerNight: Number(e.target.value) }; setConfig({ ...config, rooms: r }); }} /></div>
                    <div><label className={labelCls}>Currency</label><input className={inputCls} value={room.currency} onChange={e => { const r = [...config.rooms]; r[i] = { ...r[i], currency: e.target.value }; setConfig({ ...config, rooms: r }); }} /></div>
                    <div><label className={labelCls}>Max Occupancy</label><input type="number" className={inputCls} value={room.maxOccupancy} onChange={e => { const r = [...config.rooms]; r[i] = { ...r[i], maxOccupancy: Number(e.target.value) }; setConfig({ ...config, rooms: r }); }} /></div>
                  </div>
                  <div><label className={labelCls}>Description</label><input className={inputCls} value={room.description} onChange={e => { const r = [...config.rooms]; r[i] = { ...r[i], description: e.target.value }; setConfig({ ...config, rooms: r }); }} /></div>
                  <div><label className={labelCls}>Image URL</label><input className={inputCls} value={room.imageUrl || ""} onChange={e => { const r = [...config.rooms]; r[i] = { ...r[i], imageUrl: e.target.value }; setConfig({ ...config, rooms: r }); }} placeholder="https://... or /icon.svg" /></div>
                </div>
              ))}
            </div>
          )}

          {/* DINING */}
          {activeTab === "dining" && (
            <div className={cardCls}>
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2"><Utensils className="w-5 h-5 text-[#163a5f] dark:text-[#e4c449]" /> Dining Venues</h2>
                  <p className="text-neutral-500 text-sm mt-1">Add restaurants and dining options at your hotel.</p>
                </div>
                <button onClick={() => { setConfig({ ...config, dining: [...config.dining, { name: "", cuisine: "", hours: "", description: "" }] }); showToast("New dining venue added", "success"); }} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-neutral-800 border border-neutral-700 hover:border-neutral-600 text-neutral-300 hover:text-white transition-all">
                  <Plus className="w-4 h-4" /> Add Venue
                </button>
              </div>
              {config.dining.map((venue, i) => (
                <div key={i} className="bg-neutral-800/30 rounded-xl p-5 border border-neutral-800/50 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-neutral-300">Venue {i + 1}</span>
                    <button onClick={() => { const name = config.dining[i].name || `Venue ${i + 1}`; setConfig({ ...config, dining: config.dining.filter((_, j) => j !== i) }); showToast(`"${name}" removed`, "delete"); }} className="text-red-400/60 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className={labelCls}>Name</label><input className={inputCls} value={venue.name} onChange={e => { const d = [...config.dining]; d[i] = { ...d[i], name: e.target.value }; setConfig({ ...config, dining: d }); }} /></div>
                    <div><label className={labelCls}>Cuisine</label><input className={inputCls} value={venue.cuisine} onChange={e => { const d = [...config.dining]; d[i] = { ...d[i], cuisine: e.target.value }; setConfig({ ...config, dining: d }); }} /></div>
                    <div><label className={labelCls}>Hours</label><input className={inputCls} value={venue.hours} onChange={e => { const d = [...config.dining]; d[i] = { ...d[i], hours: e.target.value }; setConfig({ ...config, dining: d }); }} /></div>
                    <div><label className={labelCls}>Description</label><input className={inputCls} value={venue.description} onChange={e => { const d = [...config.dining]; d[i] = { ...d[i], description: e.target.value }; setConfig({ ...config, dining: d }); }} /></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* AMENITIES */}
          {activeTab === "amenities" && (
            <div className={cardCls}>
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2"><Dumbbell className="w-5 h-5 text-[#163a5f] dark:text-[#e4c449]" /> Amenities</h2>
                  <p className="text-neutral-500 text-sm mt-1">List all facilities and services available at your hotel.</p>
                </div>
                <button onClick={() => { setConfig({ ...config, amenities: [...config.amenities, { name: "", description: "", hours: "" }] }); showToast("New amenity added", "success"); }} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-neutral-800 border border-neutral-700 hover:border-neutral-600 text-neutral-300 hover:text-white transition-all">
                  <Plus className="w-4 h-4" /> Add Amenity
                </button>
              </div>
              {config.amenities.map((amenity, i) => (
                <div key={i} className="bg-neutral-800/30 rounded-xl p-5 border border-neutral-800/50 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-neutral-300">{amenity.name || `Amenity ${i + 1}`}</span>
                    <button onClick={() => { const name = config.amenities[i].name || `Amenity ${i + 1}`; setConfig({ ...config, amenities: config.amenities.filter((_, j) => j !== i) }); showToast(`"${name}" removed`, "delete"); }} className="text-red-400/60 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div><label className={labelCls}>Name</label><input className={inputCls} value={amenity.name} onChange={e => { const a = [...config.amenities]; a[i] = { ...a[i], name: e.target.value }; setConfig({ ...config, amenities: a }); }} /></div>
                    <div><label className={labelCls}>Hours</label><input className={inputCls} value={amenity.hours || ""} onChange={e => { const a = [...config.amenities]; a[i] = { ...a[i], hours: e.target.value }; setConfig({ ...config, amenities: a }); }} /></div>
                    <div><label className={labelCls}>Description</label><input className={inputCls} value={amenity.description} onChange={e => { const a = [...config.amenities]; a[i] = { ...a[i], description: e.target.value }; setConfig({ ...config, amenities: a }); }} /></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CUSTOM FAQ */}
          {activeTab === "faq" && (
            <div className={cardCls}>
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2"><MessageSquare className="w-5 h-5 text-[#163a5f] dark:text-[#e4c449]" /> Custom FAQ</h2>
                  <p className="text-neutral-500 text-sm mt-1">Add custom questions and answers specific to your hotel. If a guest&apos;s message matches the keyword, the corresponding answer will be used.</p>
                </div>
                <button onClick={() => { setConfig({ ...config, customFAQ: [...config.customFAQ, { question: "", answer: "" }] }); showToast("New FAQ entry added", "success"); }} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-neutral-800 border border-neutral-700 hover:border-neutral-600 text-neutral-300 hover:text-white transition-all">
                  <Plus className="w-4 h-4" /> Add FAQ
                </button>
              </div>
              {config.customFAQ.map((faq, i) => (
                <div key={i} className="bg-neutral-800/30 rounded-xl p-5 border border-neutral-800/50 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-neutral-300">FAQ {i + 1}</span>
                    <button onClick={() => { setConfig({ ...config, customFAQ: config.customFAQ.filter((_, j) => j !== i) }); showToast("FAQ entry removed", "delete"); }} className="text-red-400/60 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <div><label className={labelCls}>Trigger Keyword(s)</label><input className={inputCls} placeholder="e.g. airport shuttle" value={faq.question} onChange={e => { const f = [...config.customFAQ]; f[i] = { ...f[i], question: e.target.value }; setConfig({ ...config, customFAQ: f }); }} /></div>
                  <div><label className={labelCls}>Response</label><textarea className={inputCls + " h-20 resize-none"} value={faq.answer} onChange={e => { const f = [...config.customFAQ]; f[i] = { ...f[i], answer: e.target.value }; setConfig({ ...config, customFAQ: f }); }} /></div>
                </div>
              ))}

              <div className="mt-8 pt-6 border-t border-neutral-800/60 space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-neutral-200">FAQ gaps from guest escalations</h3>
                  <p className="text-neutral-500 text-sm mt-1">
                    Questions the AI could not answer are logged here. Add them to Custom FAQ above or dismiss.
                  </p>
                </div>
                {knowledgeGaps.length === 0 ? (
                  <p className="text-sm text-neutral-500">No open gaps — great coverage!</p>
                ) : (
                  knowledgeGaps.map((gap) => (
                    <div key={gap.id} className="bg-neutral-800/30 rounded-xl p-4 border border-neutral-800/50 space-y-3">
                      <p className="text-sm font-medium text-neutral-200">{gap.question}</p>
                      <p className="text-xs text-neutral-500 line-clamp-2">{gap.guest_message}</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setConfig({
                              ...config,
                              customFAQ: [...config.customFAQ, { question: gap.question, answer: "" }],
                            });
                            void fetchJsonWithAuth("/api/knowledge-gaps", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ id: gap.id, status: "added_to_faq" }),
                            }).then(() => {
                              setKnowledgeGaps((prev) => prev.filter((g) => g.id !== gap.id));
                              showToast("Added to FAQ draft — fill in the answer and save", "success");
                            });
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                        >
                          Add to FAQ
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void fetchJsonWithAuth("/api/knowledge-gaps", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ id: gap.id, status: "dismissed" }),
                            }).then(() => {
                              setKnowledgeGaps((prev) => prev.filter((g) => g.id !== gap.id));
                              showToast("Gap dismissed", "info");
                            });
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs bg-neutral-800 text-neutral-400 border border-neutral-700"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TELNYX VOICE */}
          {activeTab === "telephony" && (
            <div className="space-y-6">
              <div className={cardCls}>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Phone className="w-5 h-5 text-[#163a5f] dark:text-[#e4c449]" />
                  Telnyx Programmable Voice
                </h2>
                <p className={`text-sm ${isDark ? "text-neutral-400" : "text-neutral-600"}`}>
                  Configure Telnyx to handle inbound phone calls with a natural AI voice. Point your Telnyx phone number to{" "}
                  <code className="px-1 py-0.5 rounded text-[11px] bg-neutral-800/60 text-amber-300">{typeof window !== "undefined" ? `${window.location.origin}/api/telephony/telnyx` : "/api/telephony/telnyx"}</code>{" "}
                  in your Telnyx Mission Control Portal.
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Provider</label>
                    <select
                      className={inputCls}
                      value={config.telephony?.provider ?? "telnyx"}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          telephony: {
                            webhookUrl: config.telephony?.webhookUrl ?? "/api/telephony/telnyx",
                            enabled: config.telephony?.enabled ?? true,
                            telnyxVoice: config.telephony?.telnyxVoice ?? "Telnyx.NaturalHD",
                            telnyxPhoneNumber: config.telephony?.telnyxPhoneNumber ?? "",
                            ...config.telephony,
                            provider: e.target.value as "generic" | "twilio" | "telnyx",
                          },
                        })
                      }
                    >
                      <option value="telnyx">Telnyx (recommended)</option>
                      <option value="twilio">Twilio</option>
                      <option value="generic">Generic webhook</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelCls}>Phone number (display only)</label>
                    <input
                      className={inputCls}
                      placeholder="+1 555 000 0000"
                      value={config.telephony?.telnyxPhoneNumber ?? ""}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          telephony: {
                            webhookUrl: "/api/telephony/telnyx",
                            enabled: true,
                            provider: "telnyx",
                            ...config.telephony,
                            telnyxPhoneNumber: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>TTS Voice</label>
                  <select
                    className={inputCls}
                    value={config.telephony?.telnyxVoice ?? "Telnyx.NaturalHD"}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        telephony: {
                          webhookUrl: "/api/telephony/telnyx",
                          enabled: true,
                          provider: "telnyx",
                          ...config.telephony,
                          telnyxVoice: e.target.value,
                        },
                      })
                    }
                  >
                    <optgroup label="Telnyx Native">
                      <option value="Telnyx.NaturalHD">Telnyx NaturalHD (best quality)</option>
                      <option value="Telnyx.Natural">Telnyx Natural (budget, high-volume)</option>
                    </optgroup>
                    <optgroup label="AWS Polly — Neural">
                      <option value="Polly.Joanna-Neural">Polly Joanna — Neural (en-US female)</option>
                      <option value="Polly.Matthew-Neural">Polly Matthew — Neural (en-US male)</option>
                      <option value="Polly.Amy-Neural">Polly Amy — Neural (en-GB female)</option>
                      <option value="Polly.Brian-Neural">Polly Brian — Neural (en-GB male)</option>
                    </optgroup>
                    <optgroup label="Azure Neural">
                      <option value="Azure.en-US-EmmaNeural">Azure Emma — Neural (en-US female)</option>
                      <option value="Azure.en-US-AndrewNeural">Azure Andrew — Neural (en-US male)</option>
                      <option value="Azure.en-US-BrianMultilingualNeural">Azure Brian — Multilingual Neural</option>
                      <option value="Azure.en-US-Ava:DragonHDLatestNeural">Azure Ava — Dragon HD (en-US)</option>
                    </optgroup>
                  </select>
                  <p className={`mt-1.5 text-[11px] ${isDark ? "text-neutral-500" : "text-neutral-500"}`}>
                    This value is also controlled by the <code className="bg-neutral-800/60 text-amber-300 px-1 rounded text-[10px]">TELNYX_TTS_VOICE</code> environment variable. The env var overrides this setting.
                  </p>
                </div>

                <div className={`rounded-xl border p-4 text-sm ${isDark ? "border-neutral-800 bg-neutral-900/40" : "border-neutral-200 bg-neutral-50"}`}>
                  <p className="font-semibold mb-1">Debug with webhook.site</p>
                  <p className={isDark ? "text-neutral-400" : "text-neutral-600"}>
                    Set <code className={`px-1 rounded text-[11px] ${isDark ? "bg-neutral-800 text-amber-300" : "bg-neutral-100"}`}>TELNYX_DEBUG_WEBHOOK_URL</code> in your environment to mirror every Telnyx payload while testing. Your production Voice URL should still point to <code className={`px-1 rounded text-[11px] ${isDark ? "bg-neutral-800 text-amber-300" : "bg-neutral-100"}`}>/api/telephony/telnyx</code>.
                  </p>
                  <p className={`mt-2 text-[11px] ${isDark ? "text-neutral-500" : "text-neutral-500"}`}>
                    Preview sample TeXML:{" "}
                    <a
                      href="/api/telephony/telnyx?preview=1"
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-400 underline underline-offset-2"
                    >
                      /api/telephony/telnyx?preview=1
                    </a>
                  </p>
                </div>
              </div>

              <div className={cardCls}>
                <h3 className="font-semibold flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-widest opacity-60">Setup guide</span>
                </h3>
                <ol className={`space-y-2 text-sm list-decimal list-inside ${isDark ? "text-neutral-300" : "text-neutral-700"}`}>
                  <li>Create a free account at <a href="https://telnyx.com" target="_blank" rel="noreferrer" className="text-amber-400 underline underline-offset-2">telnyx.com</a> and buy a phone number.</li>
                  <li>Go to <strong>Mission Control → TeXML Applications → Create new</strong>.</li>
                  <li>Set <strong>Voice URL</strong> to your webhook URL above, method <strong>POST</strong>.</li>
                  <li>Assign your phone number to this TeXML Application.</li>
                  <li>Add <code className={`px-1 rounded text-[11px] ${isDark ? "bg-neutral-800 text-amber-300" : "bg-neutral-100 text-neutral-800"}`}>TELNYX_TTS_VOICE</code> and optionally <code className={`px-1 rounded text-[11px] ${isDark ? "bg-neutral-800 text-amber-300" : "bg-neutral-100 text-neutral-800"}`}>TELNYX_PUBLIC_KEY</code> to your environment variables.</li>
                  <li>Call your number — the AI receptionist will answer with a NaturalHD voice!</li>
                </ol>
              </div>
            </div>
          )}

          {/* AI PERSONA */}
          {activeTab === "persona" && (
            <div className={cardCls}>
              <h2 className="text-lg font-semibold flex items-center gap-2"><Settings className="w-5 h-5 text-[#163a5f] dark:text-[#e4c449]" /> AI Receptionist Persona</h2>
              <p className="text-neutral-500 text-sm">Define how the AI receptionist should behave and communicate. This acts as the system prompt when integrated with LLM APIs like OpenAI or Gemini.</p>
              <div><label className={labelCls}>Persona / System Prompt</label><textarea className={inputCls + " h-40 resize-none"} value={config.receptionistPersona} onChange={e => setConfig({ ...config, receptionistPersona: e.target.value })} /></div>
              <div>
                <label className={labelCls}>Voice Style</label>
                <select
                  className={inputCls}
                  value={config.voiceStyle || "warm"}
                  onChange={(e) => setConfig({ ...config, voiceStyle: e.target.value as "warm" | "professional" | "energetic" })}
                >
                  <option value="warm">Warm</option>
                  <option value="professional">Professional</option>
                  <option value="energetic">Energetic</option>
                </select>
                <p className="mt-1 text-[11px] text-neutral-500">
                  Controls speech pacing and tone used by the voice assistant and call receptionist.
                </p>
              </div>
              <div><label className={labelCls}>Language</label><input className={inputCls} value={config.language} onChange={e => setConfig({ ...config, language: e.target.value })} /></div>
            </div>
          )}
        </main>
      </div>
      </div>
    </div>
  );
}
