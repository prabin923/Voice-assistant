"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart3, TrendingUp, Globe, Clock, MessageSquare,
  ChevronLeft, Settings, LogOut, User, Loader2, Activity,
  AlertTriangle, CheckCircle2, Timer, Inbox, RefreshCw, Zap, ThumbsUp, Sun, Moon
} from "lucide-react";
import { fetchJsonWithAuth, isUnauthorizedError } from "@/lib/clientAuth";
import { StaynepLogo } from "@/components/StaynepLogo";
import { SiteShellBackdrop, siteHeaderChrome } from "@/components/SiteShellBackdrop";

interface AnalyticsData {
  total: number;
  today: number;
  avgDaily: number;
  dailyCounts: { date: string; count: number }[];
  languageDistribution: { language: string; count: number }[];
  peakHours: { hour: number; count: number }[];
  recent: { id: string; guest_message: string; ai_response: string; language: string; created_at: string }[];
  openTickets: number;
  totalTickets: number;
  resolvedTickets: number;
  escalationRate: number;
  resolutionRate: number;
  avgResolutionHours: number;
  feedbackStats: { total: number; up: number; down: number; satisfaction: number };
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

const COLORS = ["#163a5f", "#3b82f6", "#22c55e", "#a855f7", "#ca8a04", "#14b8a6", "#e4c449", "#285a82"];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [hotelUser, setHotelUser] = useState<{ name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [loadError, setLoadError] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const fetchData = async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    if (!showSpinner) setLoadError("");
    try {
      const [analytics, user] = await Promise.all([
        fetchJsonWithAuth<AnalyticsData>("/api/analytics"),
        fetchJsonWithAuth<{ name?: string }>("/api/auth/me"),
      ]);
      setData(analytics);
      if (user.name) setHotelUser({ name: user.name });
      setLastRefresh(new Date());
    } catch (err: unknown) {
      if (!isUnauthorizedError(err)) {
        setLoadError("Failed to load analytics. Please try again.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    const savedTheme = window.localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextTheme = savedTheme === "light" || savedTheme === "dark"
      ? savedTheme
      : (systemPrefersDark ? "dark" : "light");
    setTheme(nextTheme);
  }, []);
  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await fetchJsonWithAuth<{ success: boolean }>("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };

  if (loading || !data) {
    const loadingDark = theme === "dark";
    return (
      <div className={`relative min-h-screen overflow-hidden ${loadingDark ? "text-neutral-100" : "text-neutral-900"}`}>
        <SiteShellBackdrop isDark={loadingDark} />
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          {loadError ? (
            <div className="text-center space-y-4 px-4">
              <p className="text-sm text-red-400">{loadError}</p>
              <button
                onClick={() => fetchData()}
                className="px-4 py-2 rounded-xl bg-[#163a5f] hover:bg-[#1e5278] text-white text-sm font-medium"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 text-[#163a5f] dark:text-[#e4c449] animate-spin" />
              <p className={`text-sm ${loadingDark ? "text-neutral-600" : "text-neutral-500"}`}>Loading analytics...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const maxDaily = Math.max(...data.dailyCounts.map(d => d.count), 1);
  const maxHour = Math.max(...data.peakHours.map(h => h.count), 1);
  const totalLangCount = data.languageDistribution.reduce((sum, l) => sum + l.count, 0) || 1;
  const aiHandledRate = data.total > 0 ? Math.round(((data.total - data.totalTickets) / data.total) * 100) : 100;
  const isDark = theme === "dark";

  return (
    <div className={`relative min-h-screen overflow-hidden ${isDark ? "text-neutral-100" : "text-neutral-900"}`}>
      <SiteShellBackdrop isDark={isDark} />
      <div className="relative z-10">
      {loadError && (
        <div className="max-w-7xl mx-auto px-6 pt-4">
          <div className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
            {loadError}
          </div>
        </div>
      )}
      {/* Header */}
      <header className={`sticky top-0 z-20 border-b backdrop-blur-xl ${siteHeaderChrome(isDark)}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/settings" className={`flex items-center gap-2 transition-colors ${isDark ? "text-neutral-400 hover:text-white" : "text-neutral-500 hover:text-neutral-900"}`}>
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Settings</span>
            </Link>
            <div className={`h-6 w-px ${isDark ? "bg-neutral-800" : "bg-neutral-300"}`} />
            <Link href="/" className="flex shrink-0 items-center" aria-label="StayNEP home">
              <StaynepLogo isDark={isDark} size="sm" />
            </Link>
            <div className={`h-6 w-px hidden sm:block ${isDark ? "bg-neutral-800" : "bg-neutral-300"}`} />
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#163a5f] dark:text-[#e4c449]" />
              <h1 className="text-lg font-semibold">Analytics Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
              className={`h-8 w-8 rounded-xl border flex items-center justify-center transition-all ${
                isDark ? "border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600" : "border-neutral-300 text-neutral-500 hover:text-neutral-900 hover:border-neutral-400 bg-white"
              }`}
              aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all disabled:opacity-50 ${
                isDark ? "text-neutral-400 border-neutral-800 hover:border-neutral-600 hover:text-white" : "text-neutral-600 border-neutral-300 hover:border-neutral-400 hover:text-neutral-900 bg-white"
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {refreshing ? "Refreshing..." : `Updated ${Math.round((Date.now() - lastRefresh.getTime()) / 1000)}s ago`}
              </span>
            </button>
            <Link href="/admin/support" className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              isDark ? "text-neutral-400 border-neutral-800 hover:border-amber-500/30 hover:text-amber-400" : "text-neutral-600 border-neutral-300 hover:border-amber-400/50 hover:text-amber-600 bg-white"
            }`}>
              <Inbox className="w-3.5 h-3.5" />
              Support
              {data.openTickets > 0 && (
                <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${isDark ? "bg-amber-500 text-black" : "bg-amber-100 text-amber-700 border border-amber-300"}`}>{data.openTickets}</span>
              )}
            </Link>
            {hotelUser && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm ${isDark ? "bg-white/5 border border-white/[0.08] text-neutral-400" : "bg-white border border-neutral-200 text-neutral-600"}`}>
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{hotelUser.name}</span>
              </div>
            )}
            <button onClick={handleLogout} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm border transition-all ${
              isDark ? "text-neutral-500 hover:text-red-400 border-neutral-800 hover:border-red-500/30" : "text-neutral-500 hover:text-red-500 border-neutral-300 hover:border-red-400/40 bg-white"
            }`}>
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* KPI Cards — Row 1 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard icon={<MessageSquare className="w-5 h-5" />} label="Total Interactions" value={data.total} color="brand" isDark={isDark} />
          <StatCard icon={<Activity className="w-5 h-5" />} label="Today" value={data.today} color="blue" isDark={isDark} />
          <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Daily Avg (30d)" value={data.avgDaily} color="emerald" isDark={isDark} />
          <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="Escalation Rate" value={`${data.escalationRate}%`} color="amber" isDark={isDark} />
          <StatCard icon={<Zap className="w-5 h-5" />} label="AI Handled" value={`${aiHandledRate}%`} color="purple" isDark={isDark} />
          <StatCard icon={<Timer className="w-5 h-5" />} label="Avg Resolution" value={data.avgResolutionHours > 0 ? `${data.avgResolutionHours}h` : "—"} color="cyan" isDark={isDark} />
          <StatCard icon={<ThumbsUp className="w-5 h-5" />} label="Satisfaction" value={`${data.feedbackStats.satisfaction}%`} color="emerald" isDark={isDark} />
        </div>

        {/* Escalation Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className={`rounded-2xl p-4 flex items-center gap-4 border ${isDark ? "bg-amber-500/5 border-amber-500/10" : "bg-white border-amber-200/70 shadow-[0_8px_24px_rgba(245,158,11,0.08)]"}`}>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-amber-400">{data.openTickets}</p>
              <p className="text-xs text-neutral-500 uppercase tracking-wider">Open Tickets</p>
            </div>
            {data.openTickets > 0 && (
              <Link href="/admin/support" className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all">
                View
              </Link>
            )}
          </div>
          <div className={`rounded-2xl p-4 flex items-center gap-4 border ${isDark ? "bg-emerald-500/5 border-emerald-500/10" : "bg-white border-emerald-200/70 shadow-[0_8px_24px_rgba(16,185,129,0.08)]"}`}>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-400">{data.resolvedTickets}</p>
              <p className="text-xs text-neutral-500 uppercase tracking-wider">Resolved</p>
            </div>
          </div>
          <div className={`rounded-2xl p-4 flex items-center gap-4 border ${isDark ? "bg-purple-500/5 border-purple-500/10" : "bg-white border-purple-200/70 shadow-[0_8px_24px_rgba(168,85,247,0.08)]"}`}>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-purple-400">{data.resolutionRate}%</p>
              <p className="text-xs text-neutral-500 uppercase tracking-wider">Resolution Rate</p>
            </div>
          </div>
        </div>

        {/* Guest Feedback Strip */}
        {data.feedbackStats.total > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`rounded-2xl p-4 flex items-center gap-4 border ${isDark ? "bg-emerald-500/5 border-emerald-500/10" : "bg-white border-emerald-200/70 shadow-[0_8px_24px_rgba(16,185,129,0.08)]"}`}>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <ThumbsUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-emerald-400">{data.feedbackStats.up}</p>
                <p className="text-xs text-neutral-500 uppercase tracking-wider">Helpful Responses</p>
              </div>
            </div>
            <div className={`rounded-2xl p-4 flex items-center gap-4 border ${isDark ? "border-[#c9a227]/18 bg-[#163a5f]/10" : "border-[#285a82]/35 bg-white shadow-[0_8px_24px_rgba(22,58,95,0.08)]"}`}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#c9a227]/35 bg-[#163a5f]/10 text-[#163a5f] dark:bg-[#c9a227]/15 dark:text-[#e4c449]">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-amber-600 dark:text-[#e4c449]">{data.feedbackStats.down}</p>
                <p className="text-xs text-neutral-500 uppercase tracking-wider">Needs Improvement</p>
              </div>
            </div>
            <div className={`rounded-2xl p-4 flex items-center gap-4 border ${isDark ? "bg-blue-500/5 border-blue-500/10" : "bg-white border-blue-200/70 shadow-[0_8px_24px_rgba(59,130,246,0.08)]"}`}>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-blue-400">{data.feedbackStats.total}</p>
                <p className="text-xs text-neutral-500 uppercase tracking-wider">Total Ratings</p>
              </div>
            </div>
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Trend */}
          <div className={`rounded-2xl p-6 ${isDark ? "bg-neutral-900/50 border border-neutral-800/60" : "bg-white border border-neutral-200 shadow-[0_10px_30px_rgba(15,23,42,0.06)]"}`}>
            <h2 className={`text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2 ${isDark ? "text-neutral-300" : "text-neutral-700"}`}>
              <TrendingUp className="h-4 w-4 text-[#163a5f] dark:text-[#e4c449]" /> Daily Interactions (30 days)
            </h2>
            {data.dailyCounts.length === 0 ? (
              <EmptyState text="No interaction data yet" isDark={isDark} />
            ) : (
              <div className="flex items-end gap-[2px] h-48">
                {data.dailyCounts.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div className={`absolute -top-10 left-1/2 -translate-x-1/2 text-xs px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 shadow-xl border ${isDark ? "bg-neutral-800 text-neutral-300 border-neutral-700/50" : "bg-white text-neutral-700 border-neutral-200"}`}>
                      <span className="font-mono">{d.date}</span>
                      <span className="ml-2 font-bold text-amber-600 dark:text-[#e4c449]">{d.count}</span>
                    </div>
                    <div
                      className={`w-full rounded-t bg-gradient-to-t transition-all hover:from-amber-300 hover:to-[#fce878] min-h-[2px] ${
                        isDark
                          ? "from-[#285a82]/90 to-[#e4c449]/95 shadow-sm shadow-[#163a5f]/15 dark:shadow-[#c9a227]/25"
                          : "from-[#163a5f]/80 to-[#ca8a04]/95 shadow-[0_3px_10px_rgba(22,58,95,0.2)] dark:shadow-[0_3px_10px_rgba(201,162,39,0.18)]"
                      }`}
                      style={{ height: `${(d.count / maxDaily) * 100}%` }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Language Distribution */}
          <div className={`rounded-2xl p-6 ${isDark ? "bg-neutral-900/50 border border-neutral-800/60" : "bg-white border border-neutral-200 shadow-[0_10px_30px_rgba(15,23,42,0.06)]"}`}>
            <h2 className={`text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2 ${isDark ? "text-neutral-300" : "text-neutral-700"}`}>
              <Globe className="h-4 w-4 text-[#163a5f] dark:text-[#e4c449]" /> Language Distribution
            </h2>
            {data.languageDistribution.length === 0 ? (
              <EmptyState text="No language data yet" isDark={isDark} />
            ) : (
              <div className="space-y-3">
                {data.languageDistribution.slice(0, 8).map((lang, i) => {
                  const pct = Math.round((lang.count / totalLangCount) * 100);
                  return (
                    <div key={lang.language} className="group">
                      <div className="flex justify-between text-sm mb-1">
                        <span className={`${isDark ? "text-neutral-300 group-hover:text-white" : "text-neutral-700 group-hover:text-neutral-900"} transition-colors`}>{LANG_NAMES[lang.language] || lang.language}</span>
                        <span className={`${isDark ? "text-neutral-500" : "text-neutral-600"} tabular-nums`}>{lang.count} <span className={`${isDark ? "text-neutral-600" : "text-neutral-500"}`}>({pct}%)</span></span>
                      </div>
                      <div className={`h-2 rounded-full overflow-hidden ${isDark ? "bg-neutral-800" : "bg-neutral-200/80"}`}>
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_0_1px_rgba(255,255,255,0.2)]"
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
        <div className={`rounded-2xl p-6 ${isDark ? "bg-neutral-900/50 border border-neutral-800/60" : "bg-white border border-neutral-200 shadow-[0_10px_30px_rgba(15,23,42,0.06)]"}`}>
          <h2 className={`text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2 ${isDark ? "text-neutral-300" : "text-neutral-700"}`}>
            <Clock className="h-4 w-4 text-[#163a5f] dark:text-[#e4c449]" /> Activity Heatmap (24h)
          </h2>
          {data.peakHours.length === 0 ? (
            <EmptyState text="No hourly data yet" isDark={isDark} />
          ) : (
            <div className="flex items-end gap-[2px] h-36">
              {Array.from({ length: 24 }, (_, h) => {
                const entry = data.peakHours.find(p => p.hour === h);
                const count = entry?.count || 0;
                const intensity = maxHour > 0 ? count / maxHour : 0;
                return (
                  <div key={h} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div className={`absolute -top-10 left-1/2 -translate-x-1/2 text-xs px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 shadow-xl border ${isDark ? "bg-neutral-800 text-neutral-300 border-neutral-700/50" : "bg-white text-neutral-700 border-neutral-200"}`}>
                      <span className="font-mono">{String(h).padStart(2, '0')}:00</span>
                      <span className="text-blue-400 font-bold ml-2">{count}</span>
                    </div>
                    <div
                      className="w-full rounded-t transition-all min-h-[2px]"
                      style={{
                        height: maxHour > 0 ? `${(count / maxHour) * 100}%` : "2px",
                        background: intensity > 0.7
                          ? "linear-gradient(to top, #3b82f6, #60a5fa)"
                          : intensity > 0.3
                          ? "linear-gradient(to top, #3b82f680, #60a5fa80)"
                          : "rgba(59, 130, 246, 0.3)",
                      }}
                    />
                    {h % 3 === 0 && (
                      <span className={`text-[9px] mt-1 tabular-nums ${isDark ? "text-neutral-600" : "text-neutral-500"}`}>{String(h).padStart(2, '0')}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Conversations */}
        <div className={`rounded-2xl p-6 ${isDark ? "bg-neutral-900/50 border border-neutral-800/60" : "bg-white border border-neutral-200 shadow-[0_10px_30px_rgba(15,23,42,0.06)]"}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-sm font-semibold uppercase tracking-wider flex items-center gap-2 ${isDark ? "text-neutral-300" : "text-neutral-700"}`}>
              <MessageSquare className="h-4 w-4 text-[#163a5f] dark:text-[#e4c449]" /> Recent Conversations
            </h2>
            <span className={`text-xs ${isDark ? "text-neutral-600" : "text-neutral-500"}`}>Last 20</span>
          </div>
          {data.recent.length === 0 ? (
            <EmptyState text="No conversations yet — interactions will appear here as guests use the voice assistant" isDark={isDark} />
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-premium">
              {data.recent.map((msg) => (
                <div key={msg.id} className={`rounded-xl p-4 border space-y-2 transition-all ${isDark ? "bg-neutral-800/30 border-neutral-800/50 hover:border-neutral-700/60" : "bg-neutral-50 border-neutral-200 hover:border-neutral-300 hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)]"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${isDark ? "text-neutral-500" : "text-neutral-600"}`}>
                        {LANG_NAMES[msg.language] || msg.language}
                      </span>
                    </div>
                    <span className={`text-xs tabular-nums ${isDark ? "text-neutral-600" : "text-neutral-500"}`}>
                      {new Date(msg.created_at + "Z").toLocaleString()}
                    </span>
                  </div>
                  <div className={`text-sm ${isDark ? "text-neutral-300" : "text-neutral-700"}`}>
                    <span className="font-semibold text-amber-600 dark:text-[#e4c449]">Guest:</span> {msg.guest_message}
                  </div>
                  <div className={`text-sm ${isDark ? "text-neutral-400" : "text-neutral-600"}`}>
                    <span className="text-blue-400 font-semibold">AI:</span> {msg.ai_response.length > 200 ? msg.ai_response.slice(0, 200) + "…" : msg.ai_response}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, isDark }: { icon: React.ReactNode; label: string; value: number | string; color: string; isDark: boolean }) {
  const colorMap: Record<string, string> = {
    brand: "text-[#163a5f] dark:text-[#e4c449] bg-[#163a5f]/12 border-[#285a82]/30 dark:bg-[#c9a227]/14 dark:border-[#c9a227]/35",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    cyan: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  };
  return (
    <div className={`rounded-2xl p-4 flex flex-col gap-3 transition-colors ${
      isDark
        ? "bg-neutral-900/50 border border-neutral-800/60 hover:border-neutral-700/60"
        : "bg-white border border-neutral-200 hover:border-neutral-300 shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
    }`}>
      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${colorMap[color]}`}>
        {icon}
      </div>
      <div>
        <p className={`text-2xl font-bold tabular-nums ${isDark ? "text-white" : "text-neutral-900"}`}>{value}</p>
        <p className="text-[10px] text-neutral-500 uppercase tracking-wider leading-tight mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function EmptyState({ text, isDark = true }: { text: string; isDark?: boolean }) {
  return (
    <div className="h-36 flex items-center justify-center">
      <p className={`text-sm ${isDark ? "text-neutral-600" : "text-neutral-500"}`}>{text}</p>
    </div>
  );
}
