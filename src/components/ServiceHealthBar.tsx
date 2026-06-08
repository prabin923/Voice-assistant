"use client";

import { useEffect, useState } from "react";

type HealthStatus = {
  ai: boolean;
  db: boolean;
  stt: boolean;
  sms: boolean;
  email: boolean;
};

interface Props {
  isDark: boolean;
  className?: string;
}

const LABELS: { key: keyof HealthStatus; label: string }[] = [
  { key: "ai", label: "AI" },
  { key: "db", label: "DB" },
  { key: "stt", label: "STT" },
  { key: "sms", label: "SMS" },
  { key: "email", label: "Email" },
];

export function ServiceHealthBar({ isDark, className = "" }: Props) {
  const [health, setHealth] = useState<HealthStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/health")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setHealth(data as HealthStatus);
      })
      .catch(() => {
        if (!cancelled) setHealth(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!health) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {LABELS.map(({ key, label }) => (
        <span
          key={key}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
            isDark ? "bg-white/[0.04] text-neutral-500" : "bg-neutral-100 text-neutral-600"
          }`}
          title={`${label}: ${health[key] ? "ready" : "not configured"}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${health[key] ? "bg-emerald-500" : "bg-amber-500/80"}`}
          />
          {label}
        </span>
      ))}
    </div>
  );
}
