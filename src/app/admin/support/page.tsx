"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ChevronLeft, Settings, LogOut, User, Loader2,
  Inbox, CheckCircle2, Clock, Send, MessageSquare, AlertCircle,
  RefreshCw, BarChart3, Bell, ExternalLink, X
} from "lucide-react";
import { fetchJsonWithAuth, isUnauthorizedError } from "@/lib/clientAuth";

interface Ticket {
  id: string;
  guest_message: string;
  ai_response: string;
  language: string;
  status: string;
  staff_reply: string | null;
  created_at: string;
  resolved_at: string | null;
}

const LANG_NAMES: Record<string, string> = {
  "en-US": "English", "en-GB": "English (UK)", "ar-SA": "Arabic", "bn-BD": "Bengali",
  "zh-CN": "Chinese", "fr-FR": "French", "de-DE": "German", "hi-IN": "Hindi",
  "id-ID": "Indonesian", "it-IT": "Italian", "ja-JP": "Japanese", "ko-KR": "Korean",
  "ne-NP": "Nepali", "pt-BR": "Portuguese", "ru-RU": "Russian", "es-ES": "Spanish",
  "th-TH": "Thai", "tr-TR": "Turkish", "vi-VN": "Vietnamese",
};

function getTicketAge(createdAt: string): string {
  const now = new Date();
  const created = new Date(createdAt + "Z");
  const diffMs = now.getTime() - created.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

function getPriorityLevel(ticket: Ticket): { label: string; color: string; urgency: number } {
  const ageMs = Date.now() - new Date(ticket.created_at + "Z").getTime();
  const ageHours = ageMs / 1000 / 60 / 60;
  const msg = ticket.guest_message.toLowerCase();

  // Critical keywords
  if (msg.includes("emergency") || msg.includes("urgent") || msg.includes("danger") || msg.includes("help"))
    return { label: "URGENT", color: "red", urgency: 3 };
  // Aging open tickets
  if (ticket.status === "open" && ageHours > 4)
    return { label: "HIGH", color: "amber", urgency: 2 };
  if (ticket.status === "open" && ageHours > 1)
    return { label: "MEDIUM", color: "yellow", urgency: 1 };
  return { label: "NORMAL", color: "neutral", urgency: 0 };
}

export default function SupportInbox() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("open");
  const [hotelUser, setHotelUser] = useState<{ name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");

  const fetchTickets = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    if (!showSpinner) setLoadError("");
    const statusParam = filter === "all" ? "" : `?status=${filter}`;
    try {
      const data = await fetchJsonWithAuth<{ tickets: Ticket[]; openCount: number }>(`/api/support${statusParam}`);
      setTickets(data.tickets);
      setOpenCount(data.openCount);
    } catch (err: unknown) {
      if (!isUnauthorizedError(err)) {
        setLoadError("Failed to load support inbox. Please try again.");
      }
    }
    finally { setRefreshing(false); }
  }, [filter]);

  useEffect(() => {
    setLoadError("");
    fetchJsonWithAuth<{ name?: string }>("/api/auth/me")
      .then((user) => {
        if (user.name) setHotelUser(user as { name: string });
      })
      .catch((err: unknown) => {
        if (!isUnauthorizedError(err)) {
          setLoadError("Failed to load support inbox. Please try again.");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading) fetchTickets();
  }, [filter, loading, fetchTickets]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchTickets(), 15000);
    return () => clearInterval(interval);
  }, [fetchTickets]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;
    setReplying(true);
    try {
      await fetchJsonWithAuth("/api/support", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: selectedTicket.id, staffReply: replyText }),
      });
      setReplyText("");
      setSelectedTicket(null);
      showToast("Ticket resolved successfully");
      fetchTickets();
    } catch {
      showToast("Failed to send reply");
    } finally {
      setReplying(false);
    }
  };

  const handleLogout = async () => {
    await fetchJsonWithAuth<{ success: boolean }>("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        {loadError ? (
          <div className="text-center space-y-4 px-4">
            <p className="text-sm text-red-400">{loadError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
            <p className="text-sm text-neutral-600">Loading support inbox...</p>
          </div>
        )}
      </div>
    );
  }

  // Sort tickets: urgent first, then by recency
  const sortedTickets = [...tickets].sort((a, b) => {
    const pa = getPriorityLevel(a).urgency;
    const pb = getPriorityLevel(b).urgency;
    if (pa !== pb) return pb - pa;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="min-h-screen bg-neutral-950">
      {loadError && (
        <div className="max-w-7xl mx-auto px-6 pt-4">
          <div className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
            {loadError}
          </div>
        </div>
      )}
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-2 fade-in">
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-medium shadow-2xl backdrop-blur-xl">
            <CheckCircle2 className="w-4 h-4" />
            {toastMessage}
            <button onClick={() => setToastMessage(null)} className="ml-2 text-emerald-400/50 hover:text-emerald-300">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-20 bg-neutral-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/settings" className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors">
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Settings</span>
            </Link>
            <div className="h-6 w-px bg-neutral-800" />
            <div className="flex items-center gap-2">
              <Inbox className="w-5 h-5 text-amber-400" />
              <h1 className="text-lg font-semibold">Support Inbox</h1>
              {openCount > 0 && (
                <span className="ml-1 px-2.5 py-0.5 text-xs font-bold bg-amber-500 text-black rounded-full animate-pulse">{openCount}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchTickets(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-neutral-400 border border-neutral-800 hover:border-neutral-600 hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{refreshing ? "Refreshing..." : "Refresh"}</span>
            </button>
            <Link href="/admin/analytics" className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-neutral-400 border border-neutral-800 hover:border-rose-500/30 hover:text-rose-400 transition-all">
              <BarChart3 className="w-3.5 h-3.5" /> Analytics
            </Link>
            {hotelUser && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/[0.08] text-sm text-neutral-400">
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{hotelUser.name}</span>
              </div>
            )}
            <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm text-neutral-500 hover:text-red-400 border border-neutral-800 hover:border-red-500/30 transition-all">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Stats Strip */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 flex items-center gap-3">
            <Clock className="w-4 h-4 text-amber-400" />
            <div>
              <p className="text-lg font-bold text-amber-400">{openCount}</p>
              <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Open</p>
            </div>
          </div>
          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <div>
              <p className="text-lg font-bold text-emerald-400">{tickets.length - openCount >= 0 ? tickets.filter(t => t.status === "resolved").length : 0}</p>
              <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Resolved</p>
            </div>
          </div>
          <div className="bg-neutral-800/30 border border-neutral-800/60 rounded-xl p-3 flex items-center gap-3">
            <MessageSquare className="w-4 h-4 text-neutral-400" />
            <div>
              <p className="text-lg font-bold text-white">{tickets.length}</p>
              <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Total</p>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {(["open", "resolved", "all"] as const).map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f); setSelectedTicket(null); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === f
                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  : "text-neutral-400 border border-neutral-800 hover:border-neutral-600 hover:text-white"
              }`}
            >
              {f === "open" && <Clock className="w-3.5 h-3.5 inline mr-1.5" />}
              {f === "resolved" && <CheckCircle2 className="w-3.5 h-3.5 inline mr-1.5" />}
              {f === "all" && <Inbox className="w-3.5 h-3.5 inline mr-1.5" />}
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === "open" && openCount > 0 && <span className="ml-1.5 text-xs text-rose-400">({openCount})</span>}
            </button>
          ))}
        </div>

        {/* Ticket List + Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Ticket List */}
          <div className="lg:col-span-2 space-y-3 max-h-[70vh] overflow-y-auto scrollbar-premium">
            {sortedTickets.length === 0 ? (
              <div className="bg-neutral-900/50 border border-neutral-800/60 rounded-2xl p-8 text-center">
                <Inbox className="w-10 h-10 text-neutral-700 mx-auto mb-3" />
                <p className="text-sm text-neutral-600">No {filter !== "all" ? filter : ""} tickets</p>
                <p className="text-xs text-neutral-700 mt-1">Escalated conversations will appear here</p>
              </div>
            ) : (
              sortedTickets.map(ticket => {
                const priority = getPriorityLevel(ticket);
                const priorityColors: Record<string, string> = {
                  red: "border-l-red-500",
                  amber: "border-l-amber-500",
                  yellow: "border-l-yellow-500",
                  neutral: "border-l-transparent",
                };
                return (
                  <button
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`w-full text-left bg-neutral-900/50 border rounded-2xl p-4 transition-all hover:border-neutral-600 border-l-4 ${priorityColors[priority.color]} ${
                      selectedTicket?.id === ticket.id ? "border-rose-500/40 bg-rose-500/5" : "border-neutral-800/60"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          ticket.status === "open"
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-emerald-500/10 text-emerald-400"
                        }`}>
                          {ticket.status}
                        </span>
                        {priority.urgency >= 2 && (
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                            priority.color === "red" ? "bg-red-500/10 text-red-400 animate-pulse" : "bg-amber-500/10 text-amber-400"
                          }`}>
                            {priority.label}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-neutral-600 tabular-nums">
                        {getTicketAge(ticket.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-300 line-clamp-2">{ticket.guest_message}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-neutral-600">
                        {LANG_NAMES[ticket.language] || ticket.language}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-700">#{ticket.id.slice(-6)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Ticket Detail */}
          <div className="lg:col-span-3">
            {selectedTicket ? (
              <div className="bg-neutral-900/50 border border-neutral-800/60 rounded-2xl p-6 space-y-5 sticky top-24">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${
                      selectedTicket.status === "open"
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-emerald-500/10 text-emerald-400"
                    }`}>
                      {selectedTicket.status}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {LANG_NAMES[selectedTicket.language] || selectedTicket.language}
                    </span>
                    <span className="text-[10px] font-mono text-neutral-700">#{selectedTicket.id.slice(-6)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-600 tabular-nums">
                      {getTicketAge(selectedTicket.created_at)}
                    </span>
                    <button onClick={() => setSelectedTicket(null)} className="text-neutral-600 hover:text-white transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Guest Message */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                    <MessageSquare className="w-3 h-3" /> Guest Message
                  </p>
                  <div className="bg-neutral-800/40 rounded-xl p-4 text-sm text-neutral-200 leading-relaxed">
                    {selectedTicket.guest_message}
                  </div>
                </div>

                {/* AI Response */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3" /> AI Response (Escalated)
                  </p>
                  <div className="bg-neutral-800/40 rounded-xl p-4 text-sm text-neutral-300 leading-relaxed">
                    {selectedTicket.ai_response}
                  </div>
                </div>

                {/* Staff Reply */}
                {selectedTicket.staff_reply ? (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3" /> Staff Reply
                    </p>
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 text-sm text-neutral-200 leading-relaxed">
                      {selectedTicket.staff_reply}
                    </div>
                    <p className="text-xs text-neutral-600">
                      Resolved {selectedTicket.resolved_at ? getTicketAge(selectedTicket.resolved_at) : ""}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                      <Send className="w-3 h-3" /> Reply to Guest
                    </p>
                    <textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="Type your response to the guest..."
                      className="w-full rounded-xl bg-neutral-800/50 border border-neutral-700/50 px-4 py-3 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500/40 transition-all h-28 resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-neutral-600">This will mark the ticket as resolved</p>
                      <button
                        onClick={handleReply}
                        disabled={replying || !replyText.trim()}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-rose-500 hover:bg-rose-600 text-white transition-all disabled:opacity-50 shadow-lg shadow-rose-500/20"
                      >
                        {replying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {replying ? "Sending..." : "Reply & Resolve"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-neutral-900/50 border border-neutral-800/60 rounded-2xl p-12 text-center sticky top-24">
                <MessageSquare className="w-10 h-10 text-neutral-700 mx-auto mb-3" />
                <p className="text-sm text-neutral-600">Select a ticket to view details</p>
                <p className="text-xs text-neutral-700 mt-1">Tickets are sorted by priority</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
