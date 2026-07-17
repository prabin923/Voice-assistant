"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Loader2,
  LogOut,
  Plus,
  RefreshCw,
  Send,
  User,
  Wrench,
} from "lucide-react";
import { SiteShellBackdrop, siteHeaderChrome } from "@/components/SiteShellBackdrop";
import { fetchJsonWithAuth } from "@/lib/clientAuth";
import type { ServiceRequestDto } from "@/lib/serviceRequestPresenter";

type Counts = {
  open: number;
  in_progress: number;
  completed: number;
};

type Draft = {
  type: "housekeeping" | "maintenance" | "roomservice";
  priority: "low" | "medium" | "high" | "urgent";
  roomNumber: string;
  guestName: string;
  description: string;
};

const initialDraft: Draft = {
  type: "housekeeping",
  priority: "medium",
  roomNumber: "",
  guestName: "",
  description: "",
};

function formatAge(value: string): string {
  const then = new Date(value).getTime();
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function typeIcon(type: string) {
  if (type === "maintenance") return <Wrench className="h-4 w-4" strokeWidth={1.7} />;
  if (type === "roomservice") return <Send className="h-4 w-4" strokeWidth={1.7} />;
  return <ClipboardList className="h-4 w-4" strokeWidth={1.7} />;
}

function priorityClass(priority: string): string {
  if (priority === "urgent") return "border-red-500/35 bg-red-500/10 text-red-300";
  if (priority === "high") return "border-amber-500/35 bg-amber-500/10 text-amber-300";
  if (priority === "low") return "border-ice-border/25 bg-slab-elevated text-zinc-mute";
  return "border-mint-pulse/25 bg-mint-pulse/10 text-mint-pulse";
}

function statusClass(status: string): string {
  if (status === "completed") return "border-mint-pulse/25 bg-mint-pulse/10 text-mint-pulse";
  if (status === "in_progress") return "border-ice-border/30 bg-ice-border/10 text-bone-text";
  return "border-ember-orange/30 bg-ember-orange/10 text-ember-orange";
}

export default function OperationsPage() {
  const [requests, setRequests] = useState<ServiceRequestDto[]>([]);
  const [counts, setCounts] = useState<Counts>({ open: 0, in_progress: 0, completed: 0 });
  const [hotelUser, setHotelUser] = useState<{ name: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [filter, setFilter] = useState<"active" | "open" | "in_progress" | "completed" | "all">("active");
  const [draft, setDraft] = useState<Draft>(initialDraft);

  const loadRequests = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const [requestData, userData] = await Promise.all([
        fetchJsonWithAuth<{ requests: ServiceRequestDto[]; counts: Counts }>("/api/service-requests"),
        fetchJsonWithAuth<{ name?: string; email?: string }>("/api/auth/me").catch(() => null),
      ]);
      setRequests(requestData.requests ?? []);
      setCounts(requestData.counts ?? { open: 0, in_progress: 0, completed: 0 });
      if (userData?.name && userData.email) setHotelUser({ name: userData.name, email: userData.email });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load operations queue.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };

  const visibleRequests = useMemo(() => {
    const filtered = requests.filter((request) => {
      if (filter === "active") return request.status === "open" || request.status === "in_progress";
      if (filter === "all") return true;
      return request.status === filter;
    });

    const priorityWeight: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    const statusWeight: Record<string, number> = { open: 0, in_progress: 1, completed: 2 };
    return [...filtered].sort((a, b) => {
      const byStatus = (statusWeight[a.status] ?? 9) - (statusWeight[b.status] ?? 9);
      if (byStatus !== 0) return byStatus;
      const byPriority = (priorityWeight[a.priority] ?? 9) - (priorityWeight[b.priority] ?? 9);
      if (byPriority !== 0) return byPriority;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [filter, requests]);

  const updateStatus = async (id: string, status: "in_progress" | "completed") => {
    try {
      const data = await fetchJsonWithAuth<{ request: ServiceRequestDto }>("/api/service-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      setRequests((current) => current.map((request) => (request.id === id ? data.request : request)));
      await loadRequests(true);
      showToast(status === "completed" ? "Task completed." : "Task started.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update task.");
    }
  };

  const createTask = async () => {
    if (!draft.description.trim() || !draft.guestName.trim()) {
      setError("Guest name and task details are required.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const data = await fetchJsonWithAuth<{ request: ServiceRequestDto }>("/api/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      setRequests((current) => [data.request, ...current]);
      setDraft(initialDraft);
      await loadRequests(true);
      showToast("Task dispatched.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create task.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await fetchJsonWithAuth<{ success: boolean }>("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-void-canvas text-cream-text">
      <SiteShellBackdrop />
      <div className="relative z-10">
        {toast && (
          <div className="fixed right-4 top-4 z-50 rounded-[5.6px] border border-mint-pulse/30 bg-mint-pulse/10 px-4 py-3 text-sm font-medium text-mint-pulse">
            <CheckCircle2 className="mr-2 inline h-4 w-4" strokeWidth={1.7} />
            {toast}
          </div>
        )}

        <header className={`sticky top-0 z-20 border-b ${siteHeaderChrome()}`}>
          <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/settings" className="vapi-nav-label inline-flex items-center gap-2 text-zinc-mute hover:text-cream-text">
                <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
                <span className="normal-case tracking-normal">Settings</span>
              </Link>
              <div className="hidden h-6 w-px bg-iron-border sm:block" />
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-ice-border" strokeWidth={1.5} />
                <h1 className="text-sm font-medium">Operations queue</h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => loadRequests(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-[5.6px] border border-iron-border bg-carbon-surface px-3 py-2 text-xs text-bone-text transition-colors hover:border-steel-border disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} strokeWidth={1.5} />
                Refresh
              </button>
              {hotelUser && (
                <div className="inline-flex items-center gap-2 rounded-[5.6px] border border-iron-border bg-carbon-surface px-3 py-2 text-xs text-zinc-mute">
                  <User className="h-4 w-4" strokeWidth={1.5} />
                  <span>{hotelUser.name}</span>
                </div>
              )}
              <button type="button" onClick={handleLogout} className="rounded-[5.6px] border border-iron-border bg-carbon-surface p-2 text-zinc-mute hover:border-red-500/40 hover:text-red-300" aria-label="Log out">
                <LogOut className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto grid max-w-[1200px] gap-5 px-4 py-5 lg:grid-cols-[360px_1fr] lg:px-6">
          <section className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-[5.6px] border border-ember-orange/20 bg-ember-orange/10 p-3">
                <p className="text-lg font-semibold text-ember-orange">{counts.open}</p>
                <p className="vapi-nav-label text-[10px] text-zinc-mute">Open</p>
              </div>
              <div className="rounded-[5.6px] border border-ice-border/25 bg-ice-border/10 p-3">
                <p className="text-lg font-semibold text-bone-text">{counts.in_progress}</p>
                <p className="vapi-nav-label text-[10px] text-zinc-mute">Active</p>
              </div>
              <div className="rounded-[5.6px] border border-mint-pulse/25 bg-mint-pulse/10 p-3">
                <p className="text-lg font-semibold text-mint-pulse">{counts.completed}</p>
                <p className="vapi-nav-label text-[10px] text-zinc-mute">Done</p>
              </div>
            </div>

            <div className="rounded-[5.6px] border border-iron-border bg-carbon-surface p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Dispatch task</h2>
                <Plus className="h-4 w-4 text-zinc-mute" strokeWidth={1.5} />
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1">
                    <span className="vapi-nav-label block text-[10px] text-zinc-mute">Type</span>
                    <select
                      value={draft.type}
                      onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value as Draft["type"] }))}
                      className="w-full rounded-[5.6px] border border-iron-border bg-slab-elevated px-3 py-2 text-sm text-cream-text focus:border-steel-border focus:outline-none"
                    >
                      <option value="housekeeping">Housekeeping</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="roomservice">Room service</option>
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="vapi-nav-label block text-[10px] text-zinc-mute">Priority</span>
                    <select
                      value={draft.priority}
                      onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value as Draft["priority"] }))}
                      className="w-full rounded-[5.6px] border border-iron-border bg-slab-elevated px-3 py-2 text-sm text-cream-text focus:border-steel-border focus:outline-none"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={draft.roomNumber}
                    onChange={(event) => setDraft((current) => ({ ...current, roomNumber: event.target.value }))}
                    placeholder="Room"
                    className="rounded-[5.6px] border border-iron-border bg-slab-elevated px-3 py-2 text-sm text-cream-text placeholder:text-zinc-mute focus:border-steel-border focus:outline-none"
                  />
                  <input
                    value={draft.guestName}
                    onChange={(event) => setDraft((current) => ({ ...current, guestName: event.target.value }))}
                    placeholder="Guest name"
                    className="rounded-[5.6px] border border-iron-border bg-slab-elevated px-3 py-2 text-sm text-cream-text placeholder:text-zinc-mute focus:border-steel-border focus:outline-none"
                  />
                </div>
                <textarea
                  value={draft.description}
                  onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Task details"
                  className="h-24 w-full resize-none rounded-[5.6px] border border-iron-border bg-slab-elevated px-3 py-2 text-sm text-cream-text placeholder:text-zinc-mute focus:border-steel-border focus:outline-none"
                />
                <button
                  type="button"
                  onClick={createTask}
                  disabled={saving}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[5.6px] bg-ember-orange px-4 py-2.5 text-sm font-semibold text-void-canvas transition-colors hover:bg-amber-300 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Dispatch
                </button>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[
                ["active", "Active"],
                ["open", "Open"],
                ["in_progress", "In progress"],
                ["completed", "Completed"],
                ["all", "All"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key as typeof filter)}
                  className={`shrink-0 rounded-[5.6px] border px-3 py-2 text-xs font-medium transition-colors ${
                    filter === key
                      ? "border-steel-border bg-slab-elevated text-cream-text"
                      : "border-iron-border bg-carbon-surface text-zinc-mute hover:border-steel-border hover:text-cream-text"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {error && (
              <div className="rounded-[5.6px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                <AlertTriangle className="mr-2 inline h-4 w-4" strokeWidth={1.7} />
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex h-64 items-center justify-center rounded-[5.6px] border border-iron-border bg-carbon-surface">
                <Loader2 className="h-8 w-8 animate-spin text-ice-border" />
              </div>
            ) : visibleRequests.length === 0 ? (
              <div className="flex h-64 items-center justify-center rounded-[5.6px] border border-dashed border-iron-border bg-carbon-surface text-sm text-zinc-mute">
                No tasks in this view.
              </div>
            ) : (
              <div className="grid gap-3">
                {visibleRequests.map((request) => (
                  <article key={request.id} className="rounded-[5.6px] border border-iron-border bg-carbon-surface p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-[5.6px] border border-iron-border bg-slab-elevated px-2 py-1 text-[11px] font-semibold uppercase text-bone-text">
                            {typeIcon(request.type)}
                            {request.type === "roomservice" ? "Room service" : request.type}
                          </span>
                          <span className={`rounded-[5.6px] border px-2 py-1 text-[11px] font-semibold uppercase ${priorityClass(request.priority)}`}>
                            {request.priority}
                          </span>
                          <span className={`rounded-[5.6px] border px-2 py-1 text-[11px] font-semibold uppercase ${statusClass(request.status)}`}>
                            {request.status.replace("_", " ")}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs text-zinc-mute">
                            <Clock3 className="h-3.5 w-3.5" strokeWidth={1.5} />
                            {formatAge(request.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-cream-text">{request.description}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-mute">
                          <span>Guest: <strong className="font-medium text-bone-text">{request.guestName}</strong></span>
                          <span>Room: <strong className="font-medium text-bone-text">{request.roomNumber || "N/A"}</strong></span>
                          <span>#{request.id.slice(0, 8).toUpperCase()}</span>
                        </div>
                        {request.staffNotes && (
                          <p className="rounded-[5.6px] border border-iron-border bg-slab-elevated px-3 py-2 text-xs text-bone-text">{request.staffNotes}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-2 sm:flex-col">
                        {request.status === "open" && (
                          <button
                            type="button"
                            onClick={() => updateStatus(request.id, "in_progress")}
                            className="inline-flex items-center justify-center gap-2 rounded-[5.6px] border border-iron-border bg-slab-elevated px-3 py-2 text-xs font-semibold text-bone-text hover:border-steel-border"
                          >
                            <Clock3 className="h-4 w-4" strokeWidth={1.5} />
                            Start
                          </button>
                        )}
                        {request.status !== "completed" && (
                          <button
                            type="button"
                            onClick={() => updateStatus(request.id, "completed")}
                            className="inline-flex items-center justify-center gap-2 rounded-[5.6px] border border-mint-pulse/30 bg-mint-pulse/10 px-3 py-2 text-xs font-semibold text-mint-pulse hover:bg-mint-pulse/15"
                          >
                            <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />
                            Complete
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
