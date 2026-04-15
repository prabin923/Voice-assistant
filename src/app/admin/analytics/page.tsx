"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3, TrendingUp, Globe, Clock, MessageSquare,
  ChevronLeft, Settings, LogOut, User, Loader2, Activity
} from "lucide-react";

interface AnalyticsData {
  total: number;
  today: number;
  avgDaily: number;
  dailyCounts: { date: string; count: number }[];
  languageDistribution: { language: string; count: number }[];
  peakHours: { hour: number; count: number }[];
  recent: { id: string; guest_message: string; ai_response: string; language: string; created_at: string }[];
}

const LANG_NAMES: Record<string, string> = {
  "en-US": "English (US)", "en-GB": "English (UK)", "ar-SA": "Arabic", "bn-BD": "Bengali",
  "bg-BG": "Bulgarian", "zh-CN": "Chinese", "hr-HR": "Croatian", "cs-CZ": "Czech",
  "da-DK": "Danish", "nl-NL": "Dutch", "et-EE": "Estonian", "fi-FI": "Finnish",
  "fr-FR": "French", "de-DE": "German", "el-GR": "Greek", "he-IL": "Hebrew",
  "hi-IN": "Hindi", "hu-HU": "Hungarian", "id-ID": "Indonesian", "it-IT": "Italian",
  "ja-JP": "Japanese", "ko-KR": "Korean", "lt-LT": "Lithuanian", "ne-NP": "Nepali",
  "no-NO": "Norwegian", "pl-PL": "Polish", "pt-BR": "Portuguese", "ro-RO": "Romanian",
  "ru-RU": "Russian", "es-ES": "Spanish", "sw-KE": "Swahili", "th-TH": "Thai",
  "tr-TR": "Turkish", "vi-VN": "Vietnamese",
};

const COLORS = ["#f43f5e", "#3b82f6", "#22c55e", "#a855f7", "#fb923c", "#14b8a6", "#eab308", "#ec4899"];

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [hotelUser, setHotelUser] = useState<{ name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/analytics").then(r => r.json()),
      fetch("/api/auth/me").then(r => r.json()),
    ]).then(([analytics, user]) => {
      if (analytics.error) { router.push("/admin/login"); return; }
      setData(analytics);
      if (user.name) setHotelUser(user);
      setLoading(false);
    }).catch(() => router.push("/admin/login"));
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
      </div>
    );
  }

  const maxDaily = Math.max(...data.dailyCounts.map(d => d.count), 1);
  const maxHour = Math.max(...data.peakHours.map(h => h.count), 1);
  const totalLangCount = data.languageDistribution.reduce((sum, l) => sum + l.count, 0) || 1;

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
              <BarChart3 className="w-5 h-5 text-rose-400" />
              <h1 className="text-lg font-semibold">Analytics Dashboard</h1>
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

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={<MessageSquare className="w-5 h-5" />} label="Total Interactions" value={data.total} color="rose" />
          <StatCard icon={<Activity className="w-5 h-5" />} label="Today" value={data.today} color="blue" />
          <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Daily Average (30d)" value={data.avgDaily} color="emerald" />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Trend */}
          <div className="bg-neutral-900/50 border border-neutral-800/60 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-rose-400" /> Daily Interactions (30 days)
            </h2>
            {data.dailyCounts.length === 0 ? (
              <EmptyState text="No interaction data yet" />
            ) : (
              <div className="flex items-end gap-1 h-48">
                {data.dailyCounts.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-neutral-800 text-xs text-neutral-300 px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                      {d.date}: {d.count}
                    </div>
                    <div
                      className="w-full rounded-t-sm bg-rose-500/80 hover:bg-rose-400 transition-colors min-h-[2px]"
                      style={{ height: `${(d.count / maxDaily) * 100}%` }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Language Distribution */}
          <div className="bg-neutral-900/50 border border-neutral-800/60 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4 text-rose-400" /> Language Distribution
            </h2>
            {data.languageDistribution.length === 0 ? (
              <EmptyState text="No language data yet" />
            ) : (
              <div className="space-y-3">
                {data.languageDistribution.slice(0, 8).map((lang, i) => {
                  const pct = Math.round((lang.count / totalLangCount) * 100);
                  return (
                    <div key={lang.language} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-300">{LANG_NAMES[lang.language] || lang.language}</span>
                        <span className="text-neutral-500">{lang.count} ({pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Peak Hours */}
        <div className="bg-neutral-900/50 border border-neutral-800/60 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-rose-400" /> Peak Hours
          </h2>
          {data.peakHours.length === 0 ? (
            <EmptyState text="No hourly data yet" />
          ) : (
            <div className="flex items-end gap-1 h-36">
              {Array.from({ length: 24 }, (_, h) => {
                const entry = data.peakHours.find(p => p.hour === h);
                const count = entry?.count || 0;
                return (
                  <div key={h} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-neutral-800 text-xs text-neutral-300 px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                      {h}:00 — {count}
                    </div>
                    <div
                      className="w-full rounded-t-sm bg-blue-500/70 hover:bg-blue-400 transition-colors min-h-[2px]"
                      style={{ height: maxHour > 0 ? `${(count / maxHour) * 100}%` : "2px" }}
                    />
                    {h % 3 === 0 && (
                      <span className="text-[9px] text-neutral-600 mt-1">{h}:00</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Conversations */}
        <div className="bg-neutral-900/50 border border-neutral-800/60 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-rose-400" /> Recent Conversations
          </h2>
          {data.recent.length === 0 ? (
            <EmptyState text="No conversations yet — interactions will appear here as guests use the voice assistant" />
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-premium">
              {data.recent.map((msg) => (
                <div key={msg.id} className="bg-neutral-800/30 rounded-xl p-4 border border-neutral-800/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-500">
                      {LANG_NAMES[msg.language] || msg.language}
                    </span>
                    <span className="text-xs text-neutral-600">
                      {new Date(msg.created_at + "Z").toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm text-neutral-300">
                    <span className="text-rose-400 font-medium">Guest:</span> {msg.guest_message}
                  </div>
                  <div className="text-sm text-neutral-400">
                    <span className="text-blue-400 font-medium">AI:</span> {msg.ai_response.length > 200 ? msg.ai_response.slice(0, 200) + "..." : msg.ai_response}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  };
  return (
    <div className="bg-neutral-900/50 border border-neutral-800/60 rounded-2xl p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${colorMap[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-neutral-500 uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="h-36 flex items-center justify-center">
      <p className="text-sm text-neutral-600">{text}</p>
    </div>
  );
}
