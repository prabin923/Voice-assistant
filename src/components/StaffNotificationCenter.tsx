"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
} from "lucide-react";
import { fetchJsonWithAuth, isUnauthorizedError } from "@/lib/clientAuth";
import {
  getEscalationReasonLabel,
  getTicketAge,
  getTicketPriority,
  LANG_NAMES,
  type SupportTicketRow,
} from "@/lib/supportTicketUtils";

interface StaffNotificationCenterProps {
  isDark: boolean;
  cardCls: string;
  inputCls: string;
  labelCls: string;
  onToast?: (message: string, type?: "success" | "delete" | "info") => void;
  onOpenCountChange?: (count: number) => void;
}

export function StaffNotificationCenter({
  isDark,
  cardCls,
  inputCls,
  labelCls,
  onToast,
  onOpenCountChange,
}: StaffNotificationCenterProps) {
  const [tickets, setTickets] = useState<SupportTicketRow[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  const muted = isDark ? "text-neutral-500" : "text-neutral-600";
  const subCard = isDark
    ? "bg-neutral-800/40 border border-neutral-800/60"
    : "bg-neutral-50 border border-neutral-200";

  const fetchOpenTickets = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    setLoadError("");
    try {
      const data = await fetchJsonWithAuth<{ tickets: SupportTicketRow[]; openCount: number }>(
        "/api/support?status=open"
      );
      setTickets(data.tickets);
      setOpenCount(data.openCount);
      onOpenCountChange?.(data.openCount);
      if (selectedId && !data.tickets.some((t) => t.id === selectedId)) {
        setSelectedId(null);
        setReplyText("");
      }
    } catch (err: unknown) {
      if (!isUnauthorizedError(err)) {
        setLoadError("Could not load notifications. Please try again.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onOpenCountChange, selectedId]);

  useEffect(() => {
    fetchOpenTickets();
  }, [fetchOpenTickets]);

  useEffect(() => {
    const interval = window.setInterval(() => fetchOpenTickets(), 20000);
    return () => window.clearInterval(interval);
  }, [fetchOpenTickets]);

  const selected = tickets.find((t) => t.id === selectedId) ?? null;

  const handleReply = async () => {
    if (!selected || !replyText.trim()) return;
    setReplying(true);
    try {
      await fetchJsonWithAuth("/api/support", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: selected.id, staffReply: replyText.trim() }),
      });
      onToast?.("Guest handoff marked complete", "success");
      setReplyText("");
      setSelectedId(null);
      fetchOpenTickets(true);
    } catch {
      onToast?.("Failed to save staff response", "delete");
    } finally {
      setReplying(false);
    }
  };

  const sorted = [...tickets].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-6">
      <div className={cardCls}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#163a5f] dark:text-[#e4c449]" />
              Notification center
            </h2>
            <p className={`text-sm mt-1 max-w-2xl ${muted}`}>
              Ungenerated responses — when the AI could not answer confidently, guests are queued here for staff to take over.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => fetchOpenTickets(true)}
              disabled={refreshing}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-all ${
                isDark
                  ? "border-neutral-700 text-neutral-400 hover:text-white"
                  : "border-neutral-300 text-neutral-600 hover:text-neutral-900 bg-white"
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <Link
              href="/admin/support"
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-all ${
                isDark
                  ? "border-amber-500/25 text-amber-400 hover:bg-amber-500/10"
                  : "border-amber-400/35 text-amber-700 hover:bg-amber-50 bg-white"
              }`}
            >
              Full inbox
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div
          className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
            openCount > 0
              ? isDark
                ? "bg-amber-500/10 border-amber-500/25 text-amber-200"
                : "bg-amber-50 border-amber-200 text-amber-900"
              : isDark
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          {openCount > 0 ? (
            <AlertCircle className="w-5 h-5 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          )}
          <p className="text-sm font-medium">
            {openCount > 0
              ? `${openCount} guest ${openCount === 1 ? "conversation" : "conversations"} waiting for a staff response`
              : "No pending handoffs — you're all caught up"}
          </p>
        </div>
      </div>

      {loading ? (
        <div className={`${cardCls} flex items-center justify-center py-16`}>
          <Loader2 className="w-7 h-7 animate-spin text-[#163a5f] dark:text-[#e4c449]" />
        </div>
      ) : loadError ? (
        <div className={`${cardCls} text-center py-10`}>
          <p className="text-sm text-red-400 mb-4">{loadError}</p>
          <button
            type="button"
            onClick={() => fetchOpenTickets(true)}
            className="px-4 py-2 rounded-xl bg-[#163a5f] text-white text-sm font-medium"
          >
            Retry
          </button>
        </div>
      ) : sorted.length === 0 ? (
        <div className={`${cardCls} text-center py-14`}>
          <Bell className={`w-10 h-10 mx-auto mb-3 ${isDark ? "text-neutral-700" : "text-neutral-300"}`} />
          <p className="font-medium">No ungenerated responses</p>
          <p className={`text-sm mt-2 ${muted}`}>
            Escalations from the voice assistant will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.05fr]">
          <div className={`${cardCls} !p-0 overflow-hidden`}>
            <div className={`px-5 py-3 border-b text-xs font-bold uppercase tracking-wider ${isDark ? "border-neutral-800 text-neutral-500" : "border-neutral-200 text-neutral-500"}`}>
              Pending ({sorted.length})
            </div>
            <ul className="max-h-[min(520px,60vh)] overflow-y-auto scrollbar-premium divide-y divide-neutral-800/50">
              {sorted.map((ticket) => {
                const priority = getTicketPriority(ticket);
                const isSelected = selectedId === ticket.id;
                return (
                  <li key={ticket.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(ticket.id);
                        setReplyText("");
                      }}
                      className={`w-full text-left px-5 py-4 transition-colors ${
                        isSelected
                          ? isDark
                            ? "bg-[#163a5f]/20"
                            : "bg-[#163a5f]/8"
                          : isDark
                            ? "hover:bg-neutral-800/40"
                            : "hover:bg-neutral-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${priority.className}`}>
                          {priority.label}
                        </span>
                        <span className={`text-[11px] flex items-center gap-1 ${muted}`}>
                          <Clock className="w-3 h-3" />
                          {getTicketAge(ticket.created_at)}
                        </span>
                      </div>
                      <p className="text-sm font-semibold line-clamp-2">{ticket.guest_message}</p>
                      <p className={`text-[11px] mt-1.5 ${muted}`}>
                        {getEscalationReasonLabel(ticket.escalation_reason)} · {LANG_NAMES[ticket.language] ?? ticket.language}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className={cardCls}>
            {selected ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#163a5f] dark:text-[#e4c449]" />
                    Take over conversation
                  </h3>
                  <span className={`text-[10px] font-mono ${muted}`}>#{selected.id.slice(0, 8)}</span>
                </div>

                <div className={`rounded-xl p-4 space-y-3 ${subCard}`}>
                  <div>
                    <p className={labelCls}>Guest said</p>
                    <p className="text-sm leading-relaxed mt-1">{selected.guest_message}</p>
                  </div>
                  <div>
                    <p className={labelCls}>AI reply (needs follow-up)</p>
                    <p className={`text-sm leading-relaxed mt-1 ${muted}`}>{selected.ai_response}</p>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Your staff response</label>
                  <textarea
                    className={`${inputCls} mt-1 h-28 resize-none`}
                    placeholder="Write how the front desk will follow up with the guest..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                  <p className={`text-[11px] mt-2 ${muted}`}>
                    Saving marks this handoff complete and removes it from the notification center.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleReply}
                  disabled={replying || !replyText.trim()}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-medium bg-[#163a5f] hover:bg-[#1e5278] text-white disabled:opacity-50"
                >
                  {replying ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {replying ? "Saving..." : "Complete handoff"}
                </button>
              </>
            ) : (
              <div className={`text-center py-16 ${muted}`}>
                <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Select a notification to respond</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
