"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, Settings, LogOut, User, Loader2,
  Inbox, CheckCircle2, Clock, Send, MessageSquare, AlertCircle
} from "lucide-react";

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

export default function SupportInbox() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("open");
  const [hotelUser, setHotelUser] = useState<{ name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  const fetchTickets = async () => {
    const statusParam = filter === "all" ? "" : `?status=${filter}`;
    const res = await fetch(`/api/support${statusParam}`);
    const data = await res.json();
    if (data.error) { router.push("/admin/login"); return; }
    setTickets(data.tickets);
    setOpenCount(data.openCount);
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then(r => r.json()),
    ]).then(([user]) => {
      if (user.name) setHotelUser(user);
      setLoading(false);
    }).catch(() => router.push("/admin/login"));
  }, [router]);

  useEffect(() => {
    if (!loading) fetchTickets();
  }, [filter, loading]);

  const handleReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;
    setReplying(true);
    await fetch("/api/support", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: selectedTicket.id, staffReply: replyText }),
    });
    setReplyText("");
    setSelectedTicket(null);
    setReplying(false);
    fetchTickets();
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-neutral-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/settings" className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors">
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Settings</span>
            </Link>
            <div className="h-6 w-px bg-neutral-800" />
            <div className="flex items-center gap-2">
              <Inbox className="w-5 h-5 text-rose-400" />
              <h1 className="text-lg font-semibold">Support Inbox</h1>
              {openCount > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs font-bold bg-rose-500 text-white rounded-full">{openCount}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {hotelUser && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/[0.08] text-sm text-neutral-400">
                <User className="w-3.5 h-3.5" />
                <span>{hotelUser.name}</span>
              </div>
            )}
            <Link href="/settings" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-neutral-400 border border-neutral-800 hover:border-neutral-600 hover:text-white transition-all">
              <Settings className="w-4 h-4" />
            </Link>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-neutral-500 hover:text-red-400 border border-neutral-800 hover:border-red-500/30 transition-all">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
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
            {tickets.length === 0 ? (
              <div className="bg-neutral-900/50 border border-neutral-800/60 rounded-2xl p-8 text-center">
                <Inbox className="w-10 h-10 text-neutral-700 mx-auto mb-3" />
                <p className="text-sm text-neutral-600">No {filter !== "all" ? filter : ""} tickets</p>
              </div>
            ) : (
              tickets.map(ticket => (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`w-full text-left bg-neutral-900/50 border rounded-2xl p-4 transition-all hover:border-neutral-600 ${
                    selectedTicket?.id === ticket.id ? "border-rose-500/40" : "border-neutral-800/60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${
                      ticket.status === "open"
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-emerald-500/10 text-emerald-400"
                    }`}>
                      {ticket.status}
                    </span>
                    <span className="text-xs text-neutral-600">
                      {LANG_NAMES[ticket.language] || ticket.language}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-300 line-clamp-2">{ticket.guest_message}</p>
                  <p className="text-xs text-neutral-600 mt-2">
                    {new Date(ticket.created_at + "Z").toLocaleString()}
                  </p>
                </button>
              ))
            )}
          </div>

          {/* Ticket Detail */}
          <div className="lg:col-span-3">
            {selectedTicket ? (
              <div className="bg-neutral-900/50 border border-neutral-800/60 rounded-2xl p-6 space-y-5">
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
                  </div>
                  <span className="text-xs text-neutral-600">
                    {new Date(selectedTicket.created_at + "Z").toLocaleString()}
                  </span>
                </div>

                {/* Guest Message */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-rose-400">Guest Message</p>
                  <div className="bg-neutral-800/40 rounded-xl p-4 text-sm text-neutral-200">
                    {selectedTicket.guest_message}
                  </div>
                </div>

                {/* AI Response */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">AI Response</p>
                  <div className="bg-neutral-800/40 rounded-xl p-4 text-sm text-neutral-300">
                    {selectedTicket.ai_response}
                  </div>
                </div>

                {/* Staff Reply */}
                {selectedTicket.staff_reply ? (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Staff Reply</p>
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 text-sm text-neutral-200">
                      {selectedTicket.staff_reply}
                    </div>
                    <p className="text-xs text-neutral-600">
                      Resolved {selectedTicket.resolved_at ? new Date(selectedTicket.resolved_at + "Z").toLocaleString() : ""}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Reply to Guest</p>
                    <textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="Type your response to the guest..."
                      className="w-full rounded-xl bg-neutral-800/50 border border-neutral-700/50 px-4 py-3 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500/40 transition-all h-24 resize-none"
                    />
                    <button
                      onClick={handleReply}
                      disabled={replying || !replyText.trim()}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-rose-500 hover:bg-rose-600 text-white transition-all disabled:opacity-50 shadow-lg shadow-rose-500/20"
                    >
                      {replying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {replying ? "Sending..." : "Reply & Resolve"}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-neutral-900/50 border border-neutral-800/60 rounded-2xl p-12 text-center">
                <MessageSquare className="w-10 h-10 text-neutral-700 mx-auto mb-3" />
                <p className="text-sm text-neutral-600">Select a ticket to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
