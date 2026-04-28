"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Settings, Hotel, Phone, Clock, Utensils, Dumbbell,
  Save, RotateCcw, Plus, Trash2, ChevronLeft, CheckCircle2,
  AlertCircle, MessageSquare, LogOut, User, BarChart3, Inbox, X,
  Crown, Sparkles
} from "lucide-react";

interface RoomType { name: string; pricePerNight: number; currency: string; description: string; maxOccupancy: number; }
interface DiningVenue { name: string; cuisine: string; hours: string; description: string; }
interface Amenity { name: string; description: string; hours?: string; }
interface FAQ { question: string; answer: string; }

interface HotelConfig {
  branding: { hotelName: string; tagline: string; accentColor: string; welcomeMessage: string; farewellMessage: string; };
  contact: { phone: string; email: string; website?: string; address: string; city: string; country: string; };
  policies: { checkInTime: string; checkOutTime: string; cancellationPolicy: string; petPolicy: string; smokingPolicy: string; extraBedPolicy: string; childPolicy: string; };
  rooms: RoomType[];
  dining: DiningVenue[];
  amenities: Amenity[];
  customFAQ: FAQ[];
  receptionistPersona: string;
  language: string;
}

type Tab = "branding" | "contact" | "policies" | "rooms" | "dining" | "amenities" | "faq" | "persona";

export default function SettingsPage() {
  const [config, setConfig] = useState<HotelConfig | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("branding");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [hotelUser, setHotelUser] = useState<{ name: string; email: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "delete" | "info" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "delete" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    fetch("/api/config").then(r => r.json()).then(setConfig);
    fetch("/api/auth/me").then(r => r.json()).then(data => {
      if (data.name) setHotelUser(data);
    }).catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };

  const save = async () => {
    if (!config) return;
    setSaving(true);
    setSaveStatus("idle");
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) setSaveStatus("success");
      else setSaveStatus("error");
    } catch { setSaveStatus("error"); }
    finally { setSaving(false); setTimeout(() => setSaveStatus("idle"), 3000); }
  };

  const reset = async () => {
    const res = await fetch("/api/config", { method: "DELETE" });
    const data = await res.json();
    if (data.config) setConfig(data.config);
  };

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "branding", label: "Branding", icon: <Hotel className="w-4 h-4" /> },
    { id: "contact", label: "Contact", icon: <Phone className="w-4 h-4" /> },
    { id: "policies", label: "Policies", icon: <Clock className="w-4 h-4" /> },
    { id: "rooms", label: "Rooms", icon: <Hotel className="w-4 h-4" /> },
    { id: "dining", label: "Dining", icon: <Utensils className="w-4 h-4" /> },
    { id: "amenities", label: "Amenities", icon: <Dumbbell className="w-4 h-4" /> },
    { id: "faq", label: "Custom FAQ", icon: <MessageSquare className="w-4 h-4" /> },
    { id: "persona", label: "AI Persona", icon: <Settings className="w-4 h-4" /> },
  ];

  const inputCls = "w-full rounded-xl bg-neutral-800/50 border border-neutral-700/50 px-4 py-3 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500/40 transition-all";
  const labelCls = "block text-xs font-medium text-neutral-400 mb-1.5 uppercase tracking-wider";
  const cardCls = "bg-neutral-900/50 border border-neutral-800/60 rounded-2xl p-6 space-y-5";

  // Helper to update nested config
  const updateBranding = (key: string, value: string) => setConfig({ ...config, branding: { ...config.branding, [key]: value } });
  const updateContact = (key: string, value: string) => setConfig({ ...config, contact: { ...config.contact, [key]: value } });
  const updatePolicy = (key: string, value: string) => setConfig({ ...config, policies: { ...config.policies, [key]: value } });

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-2 fade-in">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl text-sm font-medium shadow-2xl backdrop-blur-xl border ${
            toast.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" :
            toast.type === "delete" ? "bg-rose-500/10 border-rose-500/20 text-rose-300" :
            "bg-blue-500/10 border-blue-500/20 text-blue-300"
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
      <header className="sticky top-0 z-20 bg-neutral-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors">
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Back to Assistant</span>
            </Link>
            <div className="h-6 w-px bg-neutral-800" />
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-rose-400" />
              <h1 className="text-lg font-semibold">Hotel Configuration</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {hotelUser && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/[0.08] text-sm text-neutral-400">
                <User className="w-3.5 h-3.5" />
                <span>{hotelUser.name}</span>
              </div>
            )}
            <Link href="/admin/support" className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-neutral-400 border border-neutral-800 hover:border-amber-500/30 hover:text-amber-400 transition-all">
              <Inbox className="w-4 h-4" /><span className="hidden sm:inline">Support</span>
            </Link>
            <Link href="/admin/analytics" className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-neutral-400 border border-neutral-800 hover:border-rose-500/30 hover:text-rose-400 transition-all">
              <BarChart3 className="w-4 h-4" /><span className="hidden sm:inline">Analytics</span>
            </Link>
            {saveStatus === "success" && (
              <span className="flex items-center gap-1.5 text-emerald-400 text-sm animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" /> Saved
              </span>
            )}
            {saveStatus === "error" && (
              <span className="flex items-center gap-1.5 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" /> Error saving
              </span>
            )}
            <button onClick={reset} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-neutral-400 border border-neutral-800 hover:border-neutral-600 hover:text-white transition-all">
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
            <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-rose-500 hover:bg-rose-600 text-white transition-all disabled:opacity-50 shadow-lg shadow-rose-500/20">
              <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Changes"}
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-neutral-500 hover:text-red-400 border border-neutral-800 hover:border-red-500/30 transition-all">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col sm:flex-row gap-6 sm:gap-8">
        {/* Sidebar Tabs — horizontal scroll on mobile, vertical on desktop */}
        <aside className="sm:w-56 shrink-0">
          <nav className="flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0 sm:sticky sm:top-24 scrollbar-premium">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-900/50"
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {/* BRANDING — PREMIUM */}
          {activeTab === "branding" && (
            <div className="space-y-6">
              {/* Hotel Identity Card */}
              <div className={cardCls}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2"><Hotel className="w-5 h-5 text-rose-400" /> Hotel Identity</h2>
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 text-amber-400">
                    <Crown className="w-3 h-3" /> Premium
                  </span>
                </div>
                <p className="text-neutral-500 text-sm">Configure how your hotel appears to guests across all touchpoints.</p>
                <div className="grid grid-cols-2 gap-5">
                  <div><label className={labelCls}>Hotel Name</label><input className={inputCls} value={config.branding.hotelName} onChange={e => updateBranding("hotelName", e.target.value)} /></div>
                  <div><label className={labelCls}>Tagline</label><input className={inputCls} value={config.branding.tagline} onChange={e => updateBranding("tagline", e.target.value)} /></div>
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
                      { name: "Rose", hex: "#f43f5e" },
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
                <h2 className="text-lg font-semibold flex items-center gap-2"><MessageSquare className="w-5 h-5 text-rose-400" /> Guest Messages</h2>
                <p className="text-neutral-500 text-sm">Customize the messages guests see when interacting with your AI receptionist.</p>
                <div><label className={labelCls}>Welcome Message</label><textarea className={inputCls + " h-20 resize-none"} value={config.branding.welcomeMessage} onChange={e => updateBranding("welcomeMessage", e.target.value)} /></div>
                <div><label className={labelCls}>Farewell Message</label><textarea className={inputCls + " h-20 resize-none"} value={config.branding.farewellMessage} onChange={e => updateBranding("farewellMessage", e.target.value)} /></div>
              </div>
            </div>
          )}

          {/* CONTACT */}
          {activeTab === "contact" && (
            <div className={cardCls}>
              <h2 className="text-lg font-semibold flex items-center gap-2"><Phone className="w-5 h-5 text-rose-400" /> Contact Information</h2>
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
              <h2 className="text-lg font-semibold flex items-center gap-2"><Clock className="w-5 h-5 text-rose-400" /> Hotel Policies</h2>
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
                  <h2 className="text-lg font-semibold flex items-center gap-2"><Hotel className="w-5 h-5 text-rose-400" /> Room Types</h2>
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
                    <div><label className={labelCls}>Price/Night</label><input type="number" className={inputCls} value={room.pricePerNight} onChange={e => { const r = [...config.rooms]; r[i] = { ...r[i], pricePerNight: Number(e.target.value) }; setConfig({ ...config, rooms: r }); }} /></div>
                    <div><label className={labelCls}>Currency</label><input className={inputCls} value={room.currency} onChange={e => { const r = [...config.rooms]; r[i] = { ...r[i], currency: e.target.value }; setConfig({ ...config, rooms: r }); }} /></div>
                    <div><label className={labelCls}>Max Occupancy</label><input type="number" className={inputCls} value={room.maxOccupancy} onChange={e => { const r = [...config.rooms]; r[i] = { ...r[i], maxOccupancy: Number(e.target.value) }; setConfig({ ...config, rooms: r }); }} /></div>
                  </div>
                  <div><label className={labelCls}>Description</label><input className={inputCls} value={room.description} onChange={e => { const r = [...config.rooms]; r[i] = { ...r[i], description: e.target.value }; setConfig({ ...config, rooms: r }); }} /></div>
                </div>
              ))}
            </div>
          )}

          {/* DINING */}
          {activeTab === "dining" && (
            <div className={cardCls}>
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2"><Utensils className="w-5 h-5 text-rose-400" /> Dining Venues</h2>
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
                  <h2 className="text-lg font-semibold flex items-center gap-2"><Dumbbell className="w-5 h-5 text-rose-400" /> Amenities</h2>
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
                  <h2 className="text-lg font-semibold flex items-center gap-2"><MessageSquare className="w-5 h-5 text-rose-400" /> Custom FAQ</h2>
                  <p className="text-neutral-500 text-sm mt-1">Add custom questions and answers specific to your hotel. If a guest's message matches the keyword, the corresponding answer will be used.</p>
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
            </div>
          )}

          {/* AI PERSONA */}
          {activeTab === "persona" && (
            <div className={cardCls}>
              <h2 className="text-lg font-semibold flex items-center gap-2"><Settings className="w-5 h-5 text-rose-400" /> AI Receptionist Persona</h2>
              <p className="text-neutral-500 text-sm">Define how the AI receptionist should behave and communicate. This acts as the system prompt when integrated with LLM APIs like OpenAI or Gemini.</p>
              <div><label className={labelCls}>Persona / System Prompt</label><textarea className={inputCls + " h-40 resize-none"} value={config.receptionistPersona} onChange={e => setConfig({ ...config, receptionistPersona: e.target.value })} /></div>
              <div><label className={labelCls}>Language</label><input className={inputCls} value={config.language} onChange={e => setConfig({ ...config, language: e.target.value })} /></div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
