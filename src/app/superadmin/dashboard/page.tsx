"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Hotel, LogOut, RefreshCw, Trash2, ExternalLink, Copy,
  Check, ShieldCheck, Plus, AlertCircle, CheckCircle2, Loader2,
  Users, Settings, ShieldAlert, Ticket, Star, CheckSquare, FileText, Inbox,
} from "lucide-react";
import { SiteShellBackdrop } from "@/components/SiteShellBackdrop";
import { vapiCardCls, vapiGhostBtn } from "@/lib/vapiUi";

interface HotelRow {
  id: string;
  name: string;
  email: string;
  slug: string | null;
  roomCount: number;
  faqCount: number;
  hotelName: string;
  isConfigured: boolean;
  createdAt: string;
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-[5.6px] border border-iron-border bg-carbon-surface p-5">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-mute">{label}</p>
      <p className="mt-1 text-3xl font-bold text-cream-text">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-zinc-mute">{sub}</p>}
    </div>
  );
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [hotels, setHotels] = useState<HotelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [analytics, setAnalytics] = useState<{
    totalHotels: number;
    totalBookings: number;
    confirmedBookings: number;
    cancelledBookings: number;
    recentBookings: number;
    totalInteractions: number;
    totalGuests: number;
    totalTickets: number;
    openTickets: number;
    totalReviews: number;
    avgRating: number;
    totalServiceRequests: number;
    openServiceRequests: number;
    escalationRate: number;
  } | null>(null);

  const loadAnalytics = useCallback(async () => {
    try {
      const res = await fetch("/api/superadmin/analytics", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error("Failed to load analytics:", err);
    }
  }, []);

  const loadHotels = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/superadmin/hotels", { credentials: "include" });
      if (res.status === 401) { router.replace("/superadmin"); return; }
      if (!res.ok) throw new Error("Failed to load hotels");
      const data = await res.json() as { hotels: HotelRow[] };
      setHotels(data.hotels);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadHotels();
    void loadAnalytics();
  }, [loadHotels, loadAnalytics]);

  const handleLogout = async () => {
    await fetch("/api/superadmin/auth", { method: "DELETE", credentials: "include" });
    router.push("/superadmin");
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch("/api/superadmin/hotels", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Delete failed");
      setHotels((prev) => prev.filter((h) => h.id !== id));
    } catch {
      setError("Failed to delete hotel.");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const generateInvite = async () => {
    setInviteLoading(true);
    setInviteUrl("");
    try {
      const res = await fetch("/api/superadmin/invite", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      const data = await res.json() as { inviteUrl: string };
      setInviteUrl(data.inviteUrl);
    } catch {
      setError("Failed to generate invite.");
    } finally {
      setInviteLoading(false);
    }
  };

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const configuredCount = hotels.filter((h) => h.isConfigured).length;
  const appBase = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="relative min-h-screen overflow-hidden bg-void-canvas text-cream-text">
      <SiteShellBackdrop />
      <div className="relative z-10">

        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-iron-border bg-carbon-surface/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-ember-orange" strokeWidth={1.5} />
              <span className="text-sm font-semibold text-cream-text">STAYNEP Super Admin</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void loadHotels()}
                disabled={loading}
                className={vapiGhostBtn + " text-xs"}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <Link href="/assistant" className={vapiGhostBtn + " text-xs"}>
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">App</span>
              </Link>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className={vapiGhostBtn + " text-xs hover:border-red-500/40 hover:text-red-300"}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">

          {error && (
            <div className="flex items-center gap-2 rounded-[5.6px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
              <button type="button" onClick={() => setError("")} className="ml-auto opacity-60 hover:opacity-100">×</button>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Total Hotels" value={analytics?.totalHotels ?? hotels.length} sub={`${configuredCount} configured`} />
            <StatCard label="Total Bookings" value={analytics?.totalBookings ?? "—"} sub={`${analytics?.recentBookings ?? 0} in last 30d`} />
            <StatCard label="AI Interactions" value={analytics?.totalInteractions ?? "—"} sub={`${analytics?.totalGuests ?? 0} unique guests`} />
            <StatCard label="Review Rating" value={analytics?.avgRating ? `⭐ ${analytics.avgRating}` : "—"} sub={`${analytics?.totalReviews ?? 0} reviews`} />
            <StatCard label="Escalation Rate" value={analytics?.escalationRate ? `${analytics.escalationRate}%` : "—"} sub={`${analytics?.openTickets ?? 0} open tickets`} />
            <StatCard label="Service Requests" value={analytics?.totalServiceRequests ?? "—"} sub={`${analytics?.openServiceRequests ?? 0} open/active`} />
            <StatCard label="Confirmed Stays" value={analytics?.confirmedBookings ?? "—"} sub="bookings confirmed" />
            <StatCard label="Cancellation Rate" value={analytics?.totalBookings ? `${Math.round((analytics.cancelledBookings / analytics.totalBookings) * 100)}%` : "—"} sub={`${analytics?.cancelledBookings ?? 0} cancelled`} />
          </div>

          {/* Invite link generator */}
          <div className={vapiCardCls}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-cream-text flex items-center gap-2">
                  <Plus className="w-4 h-4 text-ember-orange" /> Invite a new hotel
                </h2>
                <p className="text-sm text-zinc-mute mt-0.5">
                  Generate a 7-day invite link. Anyone with the link can register one hotel.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void generateInvite()}
                disabled={inviteLoading}
                className="vapi-btn-ember vapi-btn-compact shrink-0"
              >
                {inviteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Generate link
              </button>
            </div>

            {inviteUrl && (
              <div className="flex items-center gap-2 rounded-[5.6px] border border-iron-border bg-slab-elevated px-3 py-2.5">
                <code className="flex-1 truncate text-xs text-amber-300">{inviteUrl}</code>
                <button
                  type="button"
                  onClick={() => void copyInvite()}
                  className="shrink-0 inline-flex items-center gap-1 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-[11px] text-neutral-200 hover:border-neutral-500 hover:text-white transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-mint-pulse" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            )}
          </div>

          {/* Hotels table */}
          <div className={vapiCardCls}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-cream-text flex items-center gap-2">
                <Users className="w-4 h-4 text-ember-orange" /> Registered hotels
              </h2>
              <span className="rounded-full bg-slab-elevated border border-iron-border px-2.5 py-0.5 text-xs font-medium text-zinc-mute">
                {hotels.length}
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-mute" />
              </div>
            ) : hotels.length === 0 ? (
              <div className="py-12 text-center text-sm text-zinc-mute">
                No hotels registered yet. Generate an invite link above.
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-iron-border">
                      {["Hotel", "Email", "Slug", "Rooms", "Status", "Registered", "Actions"].map((h) => (
                        <th key={h} className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-zinc-mute first:pl-6 last:pr-6">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-iron-border">
                    {hotels.map((hotel) => (
                      <tr key={hotel.id} className="hover:bg-slab-elevated/40 transition-colors">
                        {/* Hotel name */}
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-iron-border bg-slab-elevated text-xs font-bold text-ember-orange">
                              {hotel.hotelName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-cream-text max-w-[140px]">{hotel.hotelName}</p>
                              <p className="truncate text-[11px] text-zinc-mute max-w-[140px]">{hotel.name}</p>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="px-6 py-3.5">
                          <span className="text-xs text-zinc-mute">{hotel.email}</span>
                        </td>

                        {/* Slug */}
                        <td className="px-6 py-3.5">
                          {hotel.slug ? (
                            <a
                              href={`${appBase}/embed/${hotel.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-ember-orange underline underline-offset-2 hover:text-amber-300"
                            >
                              {hotel.slug}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-xs text-zinc-mute/50 italic">not set</span>
                          )}
                        </td>

                        {/* Rooms */}
                        <td className="px-6 py-3.5">
                          <span className="text-xs text-zinc-mute">{hotel.roomCount}</span>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-3.5">
                          {hotel.isConfigured ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-mint-pulse/10 border border-mint-pulse/30 px-2 py-0.5 text-[11px] font-medium text-mint-pulse">
                              <CheckCircle2 className="w-3 h-3" /> Configured
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-800 border border-iron-border px-2 py-0.5 text-[11px] font-medium text-zinc-mute">
                              <Hotel className="w-3 h-3" /> Demo
                            </span>
                          )}
                        </td>

                        {/* Created */}
                        <td className="px-6 py-3.5">
                          <span className="text-xs text-zinc-mute">
                            {new Date(hotel.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-1.5">
                            {hotel.slug && (
                              <a
                                href={`${appBase}/embed/${hotel.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                className={vapiGhostBtn + " text-xs py-1 px-2"}
                                title="View embed"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <a
                              href={`${appBase}/settings`}
                              target="_blank"
                              rel="noreferrer"
                              className={vapiGhostBtn + " text-xs py-1 px-2"}
                              title="Open settings"
                            >
                              <Settings className="w-3.5 h-3.5" />
                            </a>

                            {confirmDeleteId === hotel.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => void handleDelete(hotel.id)}
                                  disabled={deletingId === hotel.id}
                                  className="inline-flex items-center gap-1 rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-[11px] text-red-300 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                >
                                  {deletingId === hotel.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="rounded-md border border-iron-border px-2 py-1 text-[11px] text-zinc-mute hover:text-cream-text transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(hotel.id)}
                                className={vapiGhostBtn + " text-xs py-1 px-2 hover:border-red-500/40 hover:text-red-300"}
                                title="Delete hotel"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Setup instructions */}
          <div className={vapiCardCls}>
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-mute">Environment variables</h3>
            <div className="space-y-2 text-xs text-neutral-400">
              <p>
                <code className="rounded bg-neutral-800 px-1.5 py-0.5 text-amber-300">SUPER_ADMIN_KEY</code>
                {" "}— your login key for this dashboard (min 16 chars).
              </p>
              <p>
                <code className="rounded bg-neutral-800 px-1.5 py-0.5 text-amber-300">ALLOW_ADMIN_REGISTRATION=true</code>
                {" "}— open registration for everyone. Leave unset to require invite links.
              </p>
              <p>
                <code className="rounded bg-neutral-800 px-1.5 py-0.5 text-amber-300">NEXT_PUBLIC_APP_URL</code>
                {" "}— your production URL (used in invite links and embed snippets).
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
