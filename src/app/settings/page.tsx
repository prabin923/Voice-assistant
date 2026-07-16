"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Settings, Hotel, Phone, Clock, Utensils, Dumbbell,
  Save, RotateCcw, Plus, Trash2, ChevronLeft, CheckCircle2,
  AlertCircle, MessageSquare, LogOut, User, BarChart3, Inbox, X,
  Crown, Sparkles, Bell, CalendarDays, CalendarCheck, Globe2, Copy,
  Code2, ExternalLink, Loader2, Download, Activity,
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
  amenitiesIncluded?: string[];
}
interface DiningVenue { name: string; cuisine: string; hours: string; description: string; }
interface Amenity { name: string; description: string; hours?: string; }
interface FAQ { question: string; answer: string; }
interface SpaService {
  name: string;
  durationMinutes: number;
  price: number;
  currency: string;
  description: string;
}

interface HotelConfig {
  branding: { hotelName: string; tagline: string; accentColor: string; welcomeMessage: string; farewellMessage: string; logoUrl?: string; };
  contact: { phone: string; email: string; website?: string; address: string; city: string; country: string; directions?: string; parkingInfo?: string; airportShuttle?: string; };
  operations?: { frontDeskHours?: string; conciergeHours?: string; housekeepingHours?: string; roomServiceHours?: string; };
  policies: { checkInTime: string; checkOutTime: string; cancellationPolicy: string; petPolicy: string; smokingPolicy: string; extraBedPolicy: string; childPolicy: string; earlyCheckIn?: string; lateCheckout?: string; };
  rooms: RoomType[];
  dining: DiningVenue[];
  amenities: Amenity[];
  spa?: SpaService[];
  customFAQ: FAQ[];
  receptionistPersona: string;
  voiceStyle?: "warm" | "professional" | "energetic";
  language: string;
  payment?: { enabled: boolean; depositType: "fixed" | "percentage"; depositAmount: number; currency: string; };
  telephony?: {
    webhookUrl: string;
    enabled: boolean;
    provider: "generic" | "twilio" | "telnyx";
    telnyxVoice?: string;
    telnyxPhoneNumber?: string;
  };
}

type Tab = "notifications" | "calendar" | "bookings" | "branding" | "embed" | "contact" | "policies" | "rooms" | "dining" | "spa" | "serviceRequests" | "amenities" | "faq" | "persona" | "telephony" | "payment" | "whatsapp";

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
  const [embedInfo, setEmbedInfo] = useState<{ slug: string; snippet: string; widgetSnippet?: string; embedUrl: string } | null>(null);
  const [embedMode, setEmbedMode] = useState<"widget" | "iframe">("widget");
  const [slugDraft, setSlugDraft] = useState("");
  const [webSync, setWebSync] = useState<{ website: { chunkCount: number; lastSyncedAt: string | null }; settings: { chunkCount: number } } | null>(null);
  const [webSyncing, setWebSyncing] = useState(false);
  const [settingsSyncing, setSettingsSyncing] = useState(false);
  const [slugSaving, setSlugSaving] = useState(false);

  // Live service requests list states
  const [requestsList, setRequestsList] = useState<
    { id: string; type: string; description: string; roomNumber?: string | null; guestName: string; status: string; priority: string; createdAt: string }[]
  >([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  const loadServiceRequests = useCallback(() => {
    setRequestsLoading(true);
    fetchJsonWithAuth<{ requests: typeof requestsList }>("/api/service-requests")
      .then((data) => {
        setRequestsList(data.requests ?? []);
      })
      .catch(() => {})
      .finally(() => setRequestsLoading(false));
  }, []);

  const updateRequestStatus = async (id: string, status: string) => {
    try {
      await fetchJsonWithAuth("/api/service-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      showToast("Service request updated.", "success");
      loadServiceRequests();
    } catch {
      showToast("Failed to update status.", "delete");
    }
  };

  useEffect(() => {
    if (activeTab === "serviceRequests") {
      loadServiceRequests();
    }
  }, [activeTab, loadServiceRequests]);

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

    fetchJsonWithAuth<{ website: { chunkCount: number; lastSyncedAt: string | null }; settings: { chunkCount: number } }>("/api/rag/sync")
      .then(setWebSync)
      .catch(() => {});

    fetchJsonWithAuth<{ slug: string; snippet: string; widgetSnippet?: string; embedUrl: string }>("/api/hotel/embed")
      .then((data) => {
        setEmbedInfo(data);
        setSlugDraft(data.slug);
      })
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

  const saveSlug = async () => {
    if (!slugDraft.trim()) return;
    setSlugSaving(true);
    try {
      const data = await fetchJsonWithAuth<{ slug: string; snippet: string; widgetSnippet?: string; embedUrl: string }>("/api/hotel/embed", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: slugDraft }),
      });
      setEmbedInfo(data);
      setSlugDraft(data.slug);
      showToast("Embed URL updated.");
    } catch {
      showToast("Could not update slug.", "delete");
    } finally {
      setSlugSaving(false);
    }
  };

  const copyEmbedSnippet = async () => {
    if (!embedInfo?.snippet) return;
    try {
      await navigator.clipboard.writeText(embedInfo.snippet);
      showToast("Embed code copied.");
    } catch {
      showToast("Copy failed — select the code manually.", "info");
    }
  };

  const refreshRagStats = async () => {
    try {
      const data = await fetchJsonWithAuth<{ website: { chunkCount: number; lastSyncedAt: string | null }; settings: { chunkCount: number } }>("/api/rag/sync");
      setWebSync(data);
    } catch { /* ignore */ }
  };

  const syncWebsite = async () => {
    if (!config?.contact?.website?.trim()) {
      showToast("Add your website URL first, then save.", "info");
      return;
    }
    setWebSyncing(true);
    try {
      const data = await fetchJsonWithAuth<{
        pagesVisited: number;
        chunksUpserted: number;
        chunksRemoved: number;
      }>("/api/rag/sync", { method: "POST" });
      showToast(`Synced ${data.pagesVisited} pages · ${data.chunksUpserted} website chunks indexed.`);
      await refreshRagStats();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Sync failed.", "delete");
    } finally {
      setWebSyncing(false);
    }
  };

  const syncSettings = async () => {
    setSettingsSyncing(true);
    try {
      const data = await fetchJsonWithAuth<{ settingsChunks: number }>("/api/rag/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "settings" }),
      });
      showToast(`Settings synced · ${data.settingsChunks} chunks indexed.`);
      await refreshRagStats();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Settings sync failed.", "delete");
    } finally {
      setSettingsSyncing(false);
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
    { id: "embed", label: "Embed & Share", icon: <Code2 className="w-4 h-4" /> },
    { id: "contact", label: "Contact", icon: <Phone className="w-4 h-4" /> },
    { id: "policies", label: "Policies", icon: <Clock className="w-4 h-4" /> },
    { id: "rooms", label: "Rooms", icon: <Hotel className="w-4 h-4" /> },
    { id: "dining", label: "Dining", icon: <Utensils className="w-4 h-4" /> },
    { id: "spa", label: "Spa Services", icon: <Sparkles className="w-4 h-4" /> },
    { id: "serviceRequests", label: "Service Requests", icon: <Inbox className="w-4 h-4" />, badge: requestsList.filter(r => r.status === "open").length || undefined },
    { id: "amenities", label: "Amenities", icon: <Dumbbell className="w-4 h-4" /> },
    { id: "faq", label: "Custom FAQ", icon: <MessageSquare className="w-4 h-4" /> },
    { id: "persona", label: "AI Persona", icon: <Settings className="w-4 h-4" /> },
    { id: "telephony", label: "Telnyx Voice", icon: <Phone className="w-4 h-4" /> },
    { id: "payment", label: "Payments", icon: <Crown className="w-4 h-4" /> },
    { id: "whatsapp", label: "WhatsApp", icon: <MessageSquare className="w-4 h-4" /> },
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
              rooms={config.rooms}
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

          {/* EMBED & SHARE */}
          {activeTab === "embed" && (
            <div className="space-y-6">
              {/* Step 1 — Slug */}
              <div className={cardCls}>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ember-orange/15 text-sm font-bold text-ember-orange">1</div>
                  <div>
                    <h2 className="text-base font-semibold text-cream-text">Set your public URL slug</h2>
                    <p className="text-sm text-zinc-mute">Used in the embed URL and the direct share link.</p>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>URL slug</label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      className={inputCls}
                      value={slugDraft}
                      onChange={(e) => setSlugDraft(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      placeholder="your-hotel-name"
                    />
                    <button
                      type="button"
                      onClick={() => void saveSlug()}
                      disabled={slugSaving || !slugDraft.trim()}
                      className="vapi-btn-ember vapi-btn-compact shrink-0"
                    >
                      {slugSaving ? "Saving…" : "Save slug"}
                    </button>
                  </div>
                  {embedInfo?.embedUrl && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-mute">
                      Direct link:&nbsp;
                      <a
                        href={embedInfo.embedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-ember-orange underline underline-offset-2"
                      >
                        {embedInfo.embedUrl}
                      </a>
                    </p>
                  )}
                </div>
              </div>

              {/* Step 2 — Embed code */}
              <div className={cardCls}>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ember-orange/15 text-sm font-bold text-ember-orange">2</div>
                  <div>
                    <h2 className="text-base font-semibold text-cream-text">Add to your website</h2>
                    <p className="text-sm text-zinc-mute">Choose how the assistant appears on the hotel&apos;s site.</p>
                  </div>
                </div>

                {/* Mode switcher */}
                <div className="flex gap-1 rounded-[5.6px] border border-iron-border bg-slab-elevated p-1">
                  <button
                    type="button"
                    onClick={() => setEmbedMode("widget")}
                    className={`flex-1 rounded-[4px] px-3 py-2 text-xs font-semibold transition-colors ${embedMode === "widget" ? "bg-ember-orange/15 text-ember-orange border border-ember-orange/30" : "text-zinc-mute hover:text-cream-text"}`}
                  >
                    🎙 Floating bubble <span className="ml-1 rounded-full bg-mint-pulse/15 px-1.5 py-0.5 text-[10px] text-mint-pulse font-bold">Recommended</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmbedMode("iframe")}
                    className={`flex-1 rounded-[4px] px-3 py-2 text-xs font-semibold transition-colors ${embedMode === "iframe" ? "bg-ember-orange/15 text-ember-orange border border-ember-orange/30" : "text-zinc-mute hover:text-cream-text"}`}
                  >
                    🖼 Inline iframe
                  </button>
                </div>

                {embedMode === "widget" ? (
                  <div className="space-y-3">
                    <div className="rounded-[5.6px] border border-mint-pulse/20 bg-mint-pulse/5 p-3 text-xs text-mint-pulse">
                      <strong>One script tag. Zero div. Zero positioning.</strong> A floating mic button appears in the corner — guests click to speak. Works on Wix, Squarespace, WordPress, Webflow, Shopify, or any custom site.
                    </div>
                    {embedInfo?.widgetSnippet ? (
                      <div className="relative">
                        <pre className="overflow-x-auto rounded-[5.6px] border border-neutral-800 bg-neutral-950/80 p-4 pr-16 text-xs leading-relaxed text-neutral-300">
                          {embedInfo.widgetSnippet}
                        </pre>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!embedInfo?.widgetSnippet) return;
                            try { await navigator.clipboard.writeText(embedInfo.widgetSnippet); showToast("Widget code copied."); }
                            catch { showToast("Copy failed — select manually.", "info"); }
                          }}
                          className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-md border border-neutral-700 bg-neutral-900 px-2.5 py-1.5 text-[11px] font-medium text-neutral-200 transition-colors hover:border-neutral-500 hover:text-white"
                        >
                          <Copy className="h-3 w-3" /> Copy
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-mute">Save a slug in step 1 first.</p>
                    )}
                    <div className="rounded-[5.6px] border border-iron-border bg-slab-elevated p-4 space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-mute">How to install (no code needed)</p>
                      <ol className="list-inside list-decimal space-y-1.5 text-xs text-neutral-400">
                        <li><strong className="text-neutral-300">Wix / Squarespace:</strong> Settings → Custom Code → paste before &lt;/body&gt;.</li>
                        <li><strong className="text-neutral-300">WordPress:</strong> Appearance → Theme Editor → footer.php, or use a &quot;Header &amp; Footer&quot; plugin.</li>
                        <li><strong className="text-neutral-300">Webflow:</strong> Project Settings → Custom Code → Footer Code.</li>
                        <li><strong className="text-neutral-300">Shopify:</strong> Online Store → Themes → Edit Code → theme.liquid before &lt;/body&gt;.</li>
                      </ol>
                    </div>
                    <div className="rounded-[5.6px] border border-iron-border bg-slab-elevated p-4 space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-mute">Optional attributes</p>
                      <div className="space-y-1 text-xs text-neutral-400 font-mono">
                        <p><code className="text-amber-300">{`data-color="#c9a227"`}</code> — accent color of the bubble button</p>
                        <p><code className="text-amber-300">{`data-position="bottom-left"`}</code> — move bubble to left side</p>
                        <p><code className="text-amber-300">{`data-label="Ask our concierge"`}</code> — hover tooltip text</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-zinc-mute">Embeds the assistant inside a fixed area on the page. Needs a <code className="rounded bg-neutral-800 px-1 text-amber-300">&lt;div&gt;</code> to mount into.</p>
                    {embedInfo?.snippet ? (
                      <div className="relative">
                        <pre className="overflow-x-auto rounded-[5.6px] border border-neutral-800 bg-neutral-950/80 p-4 pr-16 text-xs leading-relaxed text-neutral-300">
                          {embedInfo.snippet}
                        </pre>
                        <button
                          type="button"
                          onClick={() => void copyEmbedSnippet()}
                          className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-md border border-neutral-700 bg-neutral-900 px-2.5 py-1.5 text-[11px] font-medium text-neutral-200 transition-colors hover:border-neutral-500 hover:text-white"
                        >
                          <Copy className="h-3 w-3" /> Copy
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-mute">Save a slug in step 1 first.</p>
                    )}
                    <div className="rounded-[5.6px] border border-iron-border bg-slab-elevated p-4 space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-mute">How to install</p>
                      <ol className="list-inside list-decimal space-y-1.5 text-xs text-neutral-400">
                        <li>Add <code className="rounded bg-neutral-800 px-1 py-0.5 text-amber-300">{`<div id="staynep-assistant"></div>`}</code> where the assistant should appear.</li>
                        <li>Paste the <code className="rounded bg-neutral-800 px-1 py-0.5 text-amber-300">&lt;script&gt;</code> tag before <code className="rounded bg-neutral-800 px-1 py-0.5 text-amber-300">&lt;/body&gt;</code>.</li>
                      </ol>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3 — Live preview */}
              <div className={cardCls}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ember-orange/15 text-sm font-bold text-ember-orange">3</div>
                    <div>
                      <h2 className="text-base font-semibold text-cream-text">Live preview</h2>
                      <p className="text-sm text-zinc-mute">Exactly what guests will experience on your website.</p>
                    </div>
                  </div>
                  {embedInfo?.embedUrl && (
                    <a
                      href={embedInfo.embedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={vapiGhostBtn + " shrink-0 text-xs"}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Full screen</span>
                    </a>
                  )}
                </div>
                {embedInfo?.embedUrl ? (
                  <div className="overflow-hidden rounded-[5.6px] border border-iron-border">
                    <iframe
                      key={embedInfo.embedUrl}
                      src={embedInfo.embedUrl}
                      title="Voice concierge preview"
                      allow="microphone"
                      className="h-[600px] w-full border-0 bg-void-canvas"
                    />
                  </div>
                ) : (
                  <div className="flex h-48 items-center justify-center rounded-[5.6px] border border-iron-border bg-slab-elevated text-sm text-zinc-mute">
                    Save a slug to see the live preview.
                  </div>
                )}
              </div>

              {/* QR Code Card */}
              {embedInfo?.slug && (
                <div className={cardCls}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ember-orange/15 text-sm font-bold text-ember-orange">QR</div>
                    <div>
                      <h2 className="text-base font-semibold text-cream-text">Download Assistant QR Code</h2>
                      <p className="text-sm text-zinc-mute">Scan to chat with the voice assistant. Download and print on guest collaterals.</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl bg-black/10 border border-white/5">
                    <div className="bg-white p-3 rounded-xl shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/hotel/qr?slug=${embedInfo.slug}`}
                        alt="Assistant QR Code"
                        className="w-32 h-32"
                      />
                    </div>
                    <div className="space-y-3 text-center sm:text-left">
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        Print this QR code on guest keycards, in-room welcome cards, lobby banners, or dining menus so they can instantly launch the AI receptionist on their mobile phones.
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                        <a
                          href={`/api/hotel/qr?slug=${embedInfo.slug}`}
                          download={`staynep-${embedInfo.slug}-qr.svg`}
                          className="vapi-btn-ember vapi-btn-compact inline-flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" /> Download SVG
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CONTACT */}
          {activeTab === "contact" && (
            <div className="space-y-5">
              <div className={cardCls}>
                <h2 className="text-lg font-semibold flex items-center gap-2"><Phone className="w-5 h-5 text-[#163a5f] dark:text-[#e4c449]" /> Contact Information</h2>
                <p className="text-neutral-500 text-sm">This information is shared with guests when they ask for contact details.</p>
                <div className="grid grid-cols-2 gap-5">
                  <div><label className={labelCls}>Phone</label><input className={inputCls} value={config.contact.phone} onChange={e => updateContact("phone", e.target.value)} /></div>
                  <div><label className={labelCls}>Email</label><input className={inputCls} value={config.contact.email} onChange={e => updateContact("email", e.target.value)} /></div>
                  <div className="col-span-2"><label className={labelCls}>Website</label><input className={inputCls} value={config.contact.website || ""} onChange={e => updateContact("website", e.target.value)} placeholder="https://yourhotel.com" /></div>
                  <div><label className={labelCls}>Address</label><input className={inputCls} value={config.contact.address} onChange={e => updateContact("address", e.target.value)} /></div>
                  <div><label className={labelCls}>City</label><input className={inputCls} value={config.contact.city} onChange={e => updateContact("city", e.target.value)} /></div>
                  <div><label className={labelCls}>Country</label><input className={inputCls} value={config.contact.country} onChange={e => updateContact("country", e.target.value)} /></div>
                  <div className="col-span-2">
                    <label className={labelCls}>Directions to Hotel</label>
                    <textarea className={inputCls} rows={2} value={config.contact.directions || ""} onChange={e => updateContact("directions", e.target.value)} placeholder="e.g. Take Exit 5 off Ring Road, turn left on Hotel Lane. 5 min from city centre." />
                    <p className="text-xs text-zinc-mute mt-1">Guests asking &quot;how do I get to you?&quot; will hear this. The AI won&apos;t invent directions if this is empty.</p>
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>Parking Information</label>
                    <textarea className={inputCls} rows={2} value={config.contact.parkingInfo || ""} onChange={e => updateContact("parkingInfo", e.target.value)} placeholder="e.g. Valet $25/day · Self-park Level B2 $15/day · EV charging available" />
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>Airport Shuttle / Transfer</label>
                    <textarea className={inputCls} rows={2} value={config.contact.airportShuttle || ""} onChange={e => updateContact("airportShuttle", e.target.value)} placeholder="e.g. Complimentary shuttle every 30 min from Terminal 2 — call front desk to arrange" />
                  </div>
                </div>
              </div>

              {/* Operations Hours */}
              <div className={cardCls}>
                <h2 className="text-base font-semibold text-cream-text flex items-center gap-2"><Clock className="w-4 h-4 text-ember-orange" /> Operating Hours</h2>
                <p className="text-sm text-zinc-mute">Guests asking &quot;when does housekeeping come?&quot; or &quot;is front desk open?&quot; will get these answers.</p>
                <div className="grid grid-cols-2 gap-4">
                  {(["frontDeskHours","conciergeHours","housekeepingHours","roomServiceHours"] as const).map((key) => {
                    const labels: Record<string, string> = { frontDeskHours: "Front Desk", conciergeHours: "Concierge", housekeepingHours: "Housekeeping", roomServiceHours: "Room Service" };
                    return (
                      <div key={key}>
                        <label className={labelCls}>{labels[key]}</label>
                        <input className={inputCls} value={config.operations?.[key] || ""} onChange={e => setConfig({ ...config, operations: { ...(config.operations ?? {}), [key]: e.target.value } })} placeholder='e.g. "24/7" or "8 AM – 6 PM"' />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AI Knowledge Sources */}
              <div className={cardCls}>
                <div>
                  <h2 className="text-base font-semibold text-cream-text flex items-center gap-2">
                    <Globe2 className="w-4 h-4 text-ember-orange" /> AI Knowledge Sources
                  </h2>
                  <p className="text-sm text-zinc-mute mt-1">
                    The assistant retrieves answers from two sources: your hotel <strong className="text-bone-text">Settings</strong> (rooms, policies, FAQ, dining) and your <strong className="text-bone-text">Website</strong>. Both are searched together for every guest question.
                  </p>
                </div>

                {/* Source 1 — Settings */}
                <div className="rounded-[5.6px] border border-iron-border bg-slab-elevated p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-cream-text">Source 1 — Hotel Settings</p>
                      <p className="text-xs text-zinc-mute mt-0.5">Rooms, prices, policies, FAQ, dining, amenities. Auto-synced when you save settings.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void syncSettings()}
                      disabled={settingsSyncing}
                      className={`${vapiGhostBtn} text-xs shrink-0 disabled:opacity-40`}
                    >
                      {settingsSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                      {settingsSyncing ? "Syncing…" : "Re-sync"}
                    </button>
                  </div>
                  {webSync ? (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-mint-pulse" />
                      <span className="text-mint-pulse font-medium">{webSync.settings.chunkCount} settings chunks indexed</span>
                    </div>
                  ) : (
                    <div className="text-xs text-zinc-mute">Save your settings to index them for the AI.</div>
                  )}
                </div>

                {/* Source 2 — Website */}
                <div className="rounded-[5.6px] border border-iron-border bg-slab-elevated p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-cream-text">Source 2 — Hotel Website</p>
                      <p className="text-xs text-zinc-mute mt-0.5">
                        Crawls up to 15 pages. Captures content not in settings — tours, blog posts, menus, about pages.{" "}
                        {!config.contact.website?.trim() && <span className="text-amber-400">Add website URL above first.</span>}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void syncWebsite()}
                      disabled={webSyncing || !config.contact.website?.trim()}
                      className="vapi-btn-ember vapi-btn-compact shrink-0 disabled:opacity-40"
                    >
                      {webSyncing ? <><Loader2 className="w-4 h-4 animate-spin" /> Crawling…</> : <><RotateCcw className="w-4 h-4" /> Sync website</>}
                    </button>
                  </div>
                  {webSync && webSync.website.chunkCount > 0 ? (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-mint-pulse" />
                      <span className="text-mint-pulse font-medium">{webSync.website.chunkCount} website chunks indexed</span>
                      {webSync.website.lastSyncedAt && (
                        <span className="text-zinc-mute text-xs">
                          · Last synced {new Date(webSync.website.lastSyncedAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-zinc-mute">Not synced yet. Click <strong className="text-bone-text">Sync website</strong> to crawl your site.</div>
                  )}
                </div>

                {/* Total */}
                {webSync && (webSync.settings.chunkCount > 0 || webSync.website.chunkCount > 0) && (
                  <div className="flex items-center gap-2 rounded-[5.6px] border border-ember-orange/20 bg-ember-orange/5 px-4 py-2.5 text-sm">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-ember-orange" />
                    <span className="text-ember-orange font-medium">
                      {webSync.settings.chunkCount + webSync.website.chunkCount} total chunks active
                    </span>
                    <span className="text-zinc-mute text-xs">
                      — {webSync.settings.chunkCount} from settings · {webSync.website.chunkCount} from website
                    </span>
                  </div>
                )}

                <div className="rounded-[5.6px] border border-iron-border bg-slab-elevated p-4 space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-mute">How retrieval works</p>
                  <ol className="list-inside list-decimal space-y-1 text-xs text-neutral-400">
                    <li>Guest asks a question — query is embedded into a vector.</li>
                    <li>Top matching chunks from <strong className="text-neutral-300">both settings and website</strong> are retrieved by cosine similarity.</li>
                    <li>Chunks are labelled <code className="rounded bg-neutral-800 px-1 text-amber-300">[settings]</code> or <code className="rounded bg-neutral-800 px-1 text-amber-300">[website]</code> and injected into the AI prompt.</li>
                    <li>The AI always sees a compact settings summary regardless of which chunks were retrieved.</li>
                    <li>Re-sync settings after changing rooms/FAQ. Re-sync website after updating your site.</li>
                  </ol>
                </div>
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
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Early Check-In</label>
                  <input className={inputCls} value={config.policies.earlyCheckIn || ""} onChange={e => updatePolicy("earlyCheckIn", e.target.value)} placeholder="e.g. Available from 11 AM for $30 fee" />
                </div>
                <div>
                  <label className={labelCls}>Late Checkout</label>
                  <input className={inputCls} value={config.policies.lateCheckout || ""} onChange={e => updatePolicy("lateCheckout", e.target.value)} placeholder="e.g. Until 2 PM for $30 fee" />
                </div>
              </div>
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
                  <div>
                    <label className={labelCls}>In-Room Amenities</label>
                    <input
                      className={inputCls}
                      value={(room.amenitiesIncluded ?? []).join(", ")}
                      onChange={e => {
                        const r = [...config.rooms];
                        r[i] = { ...r[i], amenitiesIncluded: e.target.value.split(",").map(s => s.trim()).filter(Boolean) };
                        setConfig({ ...config, rooms: r });
                      }}
                      placeholder="Free WiFi, Safe, Mini-bar, AC, Smart TV"
                    />
                    <p className="text-xs text-zinc-mute mt-1">Comma-separated. Guests asking &quot;what&apos;s in the room?&quot; will hear these.</p>
                  </div>
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

          {/* SPA SERVICES */}
          {activeTab === "spa" && (
            <div className={cardCls}>
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2"><Sparkles className="w-5 h-5 text-[#163a5f] dark:text-[#e4c449]" /> Spa Services</h2>
                  <p className="text-neutral-500 text-sm mt-1">Configure the wellness and spa treatments offered at your hotel.</p>
                </div>
                <button
                  onClick={() => {
                    const currentSpa = config.spa || [];
                    setConfig({ ...config, spa: [...currentSpa, { name: "", durationMinutes: 60, price: 100, currency: "USD", description: "" }] });
                    showToast("New spa treatment added", "success");
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-neutral-800 border border-neutral-700 hover:border-neutral-600 text-neutral-300 hover:text-white transition-all"
                >
                  <Plus className="w-4 h-4" /> Add Treatment
                </button>
              </div>
              {(config.spa || []).map((service, i) => (
                <div key={i} className="bg-neutral-800/30 rounded-xl p-5 border border-neutral-800/50 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-neutral-300">Treatment {i + 1}</span>
                    <button
                      onClick={() => {
                        const currentSpa = config.spa || [];
                        const name = currentSpa[i].name || `Treatment ${i + 1}`;
                        setConfig({ ...config, spa: currentSpa.filter((_, j) => j !== i) });
                        showToast(`"${name}" removed`, "delete");
                      }}
                      className="text-red-400/60 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className={labelCls}>Name</label><input className={inputCls} value={service.name} onChange={e => { const s = [...(config.spa || [])]; s[i] = { ...s[i], name: e.target.value }; setConfig({ ...config, spa: s }); }} /></div>
                    <div><label className={labelCls}>Duration (Minutes)</label><input type="number" className={inputCls} value={service.durationMinutes} onChange={e => { const s = [...(config.spa || [])]; s[i] = { ...s[i], durationMinutes: Number(e.target.value) }; setConfig({ ...config, spa: s }); }} /></div>
                    <div><label className={labelCls}>Price</label><input type="number" className={inputCls} value={service.price} onChange={e => { const s = [...(config.spa || [])]; s[i] = { ...s[i], price: Number(e.target.value) }; setConfig({ ...config, spa: s }); }} /></div>
                    <div><label className={labelCls}>Currency</label><input className={inputCls} value={service.currency} onChange={e => { const s = [...(config.spa || [])]; s[i] = { ...s[i], currency: e.target.value }; setConfig({ ...config, spa: s }); }} /></div>
                    <div className="col-span-2"><label className={labelCls}>Description</label><input className={inputCls} value={service.description} onChange={e => { const s = [...(config.spa || [])]; s[i] = { ...s[i], description: e.target.value }; setConfig({ ...config, spa: s }); }} /></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SERVICE REQUESTS */}
          {activeTab === "serviceRequests" && (
            <div className={cardCls}>
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2"><Inbox className="w-5 h-5 text-[#163a5f] dark:text-[#e4c449]" /> Service Requests</h2>
                <p className="text-neutral-500 text-sm mt-1">Live ticketing log for housekeeping, maintenance, and room service.</p>
              </div>

              {requestsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-zinc-mute" />
                </div>
              ) : requestsList.length === 0 ? (
                <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-neutral-800 bg-neutral-900/10 text-zinc-mute">
                  No service requests submitted yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {requestsList.map((req) => (
                    <div
                      key={req.id}
                      className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between gap-4 transition-all duration-300 ${
                        req.status === "completed"
                          ? "border-neutral-800/60 bg-neutral-900/10 opacity-70"
                          : req.priority === "high" || req.priority === "urgent"
                            ? "border-red-500/25 bg-red-500/[0.03]"
                            : "border-neutral-800 bg-neutral-900/30"
                      }`}
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                            req.status === "completed" ? "bg-neutral-800 text-neutral-400" : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          }`}>
                            {req.type}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            req.priority === "high" || req.priority === "urgent"
                              ? "bg-red-500/10 text-red-400"
                              : "bg-neutral-800 text-neutral-400"
                          }`}>
                            {req.priority.toUpperCase()}
                          </span>
                          <span className={`text-[10px] font-mono text-neutral-500`}>
                            #{req.id.slice(0, 8).toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-neutral-200">
                          {req.description}
                        </p>
                        <p className="text-xs text-neutral-400">
                          Guest: <strong className="text-neutral-300">{req.guestName}</strong> · Room: <strong className="text-neutral-300">{req.roomNumber || "N/A"}</strong>
                        </p>
                        <p className="text-[10px] text-neutral-500">
                          Created at: {new Date(req.createdAt).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex sm:flex-col justify-end gap-2 shrink-0 self-start sm:self-center">
                        {req.status === "open" && (
                          <button
                            onClick={() => updateRequestStatus(req.id, "in_progress")}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-all border border-neutral-700"
                          >
                            Mark In Progress
                          </button>
                        )}
                        {req.status !== "completed" && (
                          <button
                            onClick={() => updateRequestStatus(req.id, "completed")}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-mint-pulse/15 border border-mint-pulse/30 text-mint-pulse hover:bg-mint-pulse/25 transition-all"
                          >
                            Mark Completed
                          </button>
                        )}
                        {req.status === "completed" && (
                          <span className="text-xs text-mint-pulse font-bold flex items-center gap-1">
                            ✓ Completed
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

          {/* PAYMENTS */}
          {activeTab === "payment" && (
            <div className="space-y-6">
              <div className={cardCls}>
                <h2 className="text-lg font-semibold flex items-center gap-2"><Crown className="w-5 h-5 text-amber-400" /> Deposit & Payments</h2>
                <p className="text-sm text-zinc-mute">Collect a deposit at the time of booking via Stripe. Guests pay before the booking is confirmed.</p>

                <div className="flex items-center justify-between rounded-[5.6px] border border-iron-border bg-slab-elevated px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-cream-text">Enable deposit collection</p>
                    <p className="text-xs text-zinc-mute mt-0.5">Requires <code className="rounded bg-neutral-800 px-1 text-amber-300">STRIPE_SECRET_KEY</code> in your environment.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, payment: { ...(config.payment ?? { depositType: "percentage", depositAmount: 25, currency: "USD" }), enabled: !(config.payment?.enabled) } })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 transition-colors ${config.payment?.enabled ? "border-ember-orange bg-ember-orange" : "border-iron-border bg-carbon-surface"}`}
                    role="switch"
                    aria-checked={config.payment?.enabled ?? false}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${config.payment?.enabled ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>

                {config.payment?.enabled && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelCls}>Deposit type</label>
                      <select
                        className={inputCls}
                        value={config.payment?.depositType ?? "percentage"}
                        onChange={(e) => setConfig({ ...config, payment: { ...(config.payment!), depositType: e.target.value as "fixed" | "percentage" } })}
                      >
                        <option value="percentage">Percentage of total</option>
                        <option value="fixed">Fixed amount</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>{config.payment?.depositType === "fixed" ? "Deposit amount" : "Deposit percentage (%)"}</label>
                      <input
                        type="number"
                        className={inputCls}
                        value={config.payment?.depositAmount ?? 25}
                        onChange={(e) => setConfig({ ...config, payment: { ...(config.payment!), depositAmount: Number(e.target.value) } })}
                        min={1}
                        max={config.payment?.depositType === "percentage" ? 100 : undefined}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Currency</label>
                      <input
                        className={inputCls}
                        value={config.payment?.currency ?? "USD"}
                        onChange={(e) => setConfig({ ...config, payment: { ...(config.payment!), currency: e.target.value.toUpperCase() } })}
                        placeholder="USD"
                        maxLength={5}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className={cardCls}>
                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-mute">Stripe setup</h3>
                <ol className="space-y-2 text-sm text-neutral-400 list-decimal list-inside">
                  <li>Create a free account at <a href="https://stripe.com" target="_blank" rel="noreferrer" className="text-amber-400 underline">stripe.com</a>.</li>
                  <li>Go to <strong className="text-neutral-300">Developers → API keys</strong> → copy the Secret key.</li>
                  <li>Add <code className="rounded bg-neutral-800 px-1 text-amber-300">STRIPE_SECRET_KEY=sk_live_...</code> to your environment variables (Vercel → Settings → Env Vars).</li>
                  <li>Enable the toggle above, set your deposit amount, and save.</li>
                  <li>Guests will see a <strong className="text-neutral-300">Pay deposit</strong> button after confirming booking details.</li>
                </ol>
              </div>
            </div>
          )}

          {/* WHATSAPP */}
          {activeTab === "whatsapp" && (
            <div className="space-y-6">
              <div className={cardCls}>
                <h2 className="text-lg font-semibold flex items-center gap-2"><MessageSquare className="w-5 h-5 text-[#25d366]" /> WhatsApp Chatbot</h2>
                <p className="text-sm text-zinc-mute">Let guests book and ask questions by texting your hotel&apos;s WhatsApp number. Same AI, same booking flow — no app needed.</p>

                <div className="rounded-[5.6px] border border-iron-border bg-slab-elevated p-4 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-mute">Webhook URL</p>
                  <div className="flex items-center gap-2 rounded-[5.6px] border border-neutral-800 bg-neutral-950/80 px-3 py-2">
                    <code className="flex-1 truncate text-xs text-amber-300">
                      {typeof window !== "undefined" ? `${window.location.origin}/api/whatsapp/webhook` : "/api/whatsapp/webhook"}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${window.location.origin}/api/whatsapp/webhook`;
                        void navigator.clipboard.writeText(url);
                        showToast("Webhook URL copied.");
                      }}
                      className="shrink-0 inline-flex items-center gap-1 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-[11px] text-neutral-200 hover:border-neutral-500 hover:text-white transition-colors"
                    >
                      <Copy className="h-3 w-3" /> Copy
                    </button>
                  </div>
                </div>

                <div className={cardCls.replace("p-6", "p-4")}>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-mute mb-3">Environment variables needed</p>
                  <div className="space-y-1 text-xs text-neutral-400 font-mono">
                    <p><code className="text-amber-300">TWILIO_ACCOUNT_SID</code> — from twilio.com/console</p>
                    <p><code className="text-amber-300">TWILIO_AUTH_TOKEN</code> — from twilio.com/console</p>
                    <p><code className="text-amber-300">TWILIO_WHATSAPP_NUMBER</code> — e.g. <code className="text-neutral-300">+14155238886</code></p>
                  </div>
                </div>
              </div>

              <div className={cardCls}>
                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-mute">Setup guide</h3>
                <ol className="space-y-2 text-sm text-neutral-400 list-decimal list-inside">
                  <li>Create a Twilio account at <a href="https://twilio.com" target="_blank" rel="noreferrer" className="text-amber-400 underline">twilio.com</a>.</li>
                  <li>Go to <strong className="text-neutral-300">Messaging → Try it out → WhatsApp</strong> to get a sandbox number.</li>
                  <li>In the WhatsApp sandbox settings, set <strong className="text-neutral-300">When a message comes in</strong> to your webhook URL above (HTTP POST).</li>
                  <li>Add the 3 env vars above to your Vercel project.</li>
                  <li>Redeploy and test by WhatsApp messaging the Twilio sandbox number.</li>
                  <li>For production: apply for a WhatsApp Business number through Twilio.</li>
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
