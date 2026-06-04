"use client";

import { useEffect, useState } from "react";
import { Check, Globe2, Mic, PhoneCall } from "lucide-react";

const PIPELINE_LINES = [
  { time: "00:04", text: "Do you have a late check-in option tonight?" },
  { time: "00:07", text: "Yes — check-in starts at 3 PM, but we can arrange a late arrival." },
  { time: "00:11", text: "Can someone meet me at the airport?" },
];

const STEPS = ["Capture", "Transcribe", "Reply", "Escalate"] as const;

export function VoicePipelineDemo({ isDark }: { isDark: boolean }) {
  const [activeStep, setActiveStep] = useState(0);
  const [lineIndex, setLineIndex] = useState(0);
  const [typedChars, setTypedChars] = useState(0);

  useEffect(() => {
    const stepTimer = window.setInterval(() => {
      setActiveStep((value) => (value + 1) % STEPS.length);
    }, 3200);
    return () => window.clearInterval(stepTimer);
  }, []);

  useEffect(() => {
    const line = PIPELINE_LINES[lineIndex]?.text ?? "";
    if (typedChars >= line.length) {
      const pause = window.setTimeout(() => {
        setLineIndex((value) => (value + 1) % PIPELINE_LINES.length);
        setTypedChars(0);
      }, 1400);
      return () => window.clearTimeout(pause);
    }

    const typeTimer = window.setTimeout(() => {
      setTypedChars((value) => value + 1);
    }, 22);
    return () => window.clearTimeout(typeTimer);
  }, [lineIndex, typedChars]);

  const currentLine = PIPELINE_LINES[lineIndex]?.text ?? "";
  const visibleText = currentLine.slice(0, typedChars);
  const panel = isDark ? "border-white/10 bg-[#0a1020]/88" : "border-slate-200 bg-white/92";
  const subpanel = isDark ? "bg-white/[0.04] border-white/8" : "bg-slate-50 border-slate-200";

  return (
    <div className={`voice-pipeline relative overflow-hidden rounded-[1.5rem] border shadow-2xl ${panel}`}>
      <div className="voice-pipeline-glow" aria-hidden />

      <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </span>
          <span className={`text-xs font-bold uppercase tracking-[0.18em] ${isDark ? "text-white/70" : "text-slate-600"}`}>
            Live concierge pipeline
          </span>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${isDark ? "bg-cyan-400/10 text-cyan-200" : "bg-sky-100 text-sky-700"}`}>
          EN · 284ms
        </span>
      </div>

      <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_0.92fr]">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {[
              { icon: Mic, label: "Tap to speak" },
              { icon: PhoneCall, label: "Concierge call" },
              { icon: Globe2, label: "34+ languages" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${subpanel}`}>
                <Icon className="h-3.5 w-3.5 opacity-70" />
                {label}
              </div>
            ))}
          </div>

          <div className={`rounded-2xl border p-4 ${subpanel}`}>
            <p className={`text-[10px] font-black uppercase tracking-[0.16em] ${isDark ? "text-white/45" : "text-slate-500"}`}>
              Live transcript
            </p>
            <div className="mt-3 space-y-2 font-mono text-[12px] leading-relaxed">
              {PIPELINE_LINES.slice(0, lineIndex).map((line) => (
                <p key={line.time} className={isDark ? "text-white/55" : "text-slate-600"}>
                  <span className="opacity-50">{line.time}</span> {line.text}
                </p>
              ))}
              <p className={isDark ? "text-white" : "text-slate-900"}>
                <span className="opacity-50">{PIPELINE_LINES[lineIndex]?.time}</span> {visibleText}
                <span className="voice-pipeline-cursor" />
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className={`rounded-2xl border p-3 ${subpanel}`}>
              <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${isDark ? "text-[#f8d36a]/80" : "text-amber-700"}`}>
                Intent
              </p>
              <p className="mt-1.5 text-sm font-semibold">Late check-in</p>
            </div>
            <div className={`rounded-2xl border p-3 ${subpanel}`}>
              <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${isDark ? "text-emerald-300/80" : "text-emerald-700"}`}>
                Policy match
              </p>
              <p className="mt-1.5 text-sm font-semibold">Check-in 3 PM</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="voice-pipeline-steps grid grid-cols-4 gap-1.5">
            {STEPS.map((step, index) => (
              <div
                key={step}
                className={`rounded-xl border px-2 py-2 text-center transition-all duration-500 ${
                  index === activeStep
                    ? isDark
                      ? "border-cyan-300/35 bg-cyan-300/10 text-cyan-100"
                      : "border-[#163a5f]/25 bg-sky-50 text-[#163a5f]"
                    : isDark
                      ? "border-white/8 bg-white/[0.02] text-white/45"
                      : "border-slate-200 bg-white text-slate-500"
                }`}
              >
                <p className="text-[9px] font-black uppercase tracking-wider">Step {index + 1}</p>
                <p className="mt-0.5 text-[11px] font-bold">{step}</p>
              </div>
            ))}
          </div>

          <div className={`rounded-2xl border p-4 ${subpanel}`}>
            <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${isDark ? "text-[#8ee8ff]/75" : "text-sky-700"}`}>
              Assistant reply
            </p>
            <p className={`mt-2 text-sm leading-6 ${isDark ? "text-white/88" : "text-slate-800"}`}>
              We can note a late arrival and arrange airport pickup through the front desk team.
            </p>
          </div>

          <div className="space-y-2">
            {[
              { label: "Support ticket", detail: "Created for concierge handoff" },
              { label: "Staff alert", detail: "Email sent to front desk" },
              { label: "Guest transcript", detail: "Saved to call history" },
            ].map((item, index) => (
              <div
                key={item.label}
                className={`flex items-center justify-between rounded-xl border px-3 py-2.5 transition-all duration-500 ${subpanel} ${
                  index <= activeStep - 2 ? "opacity-100" : "opacity-55"
                }`}
              >
                <div>
                  <p className="text-xs font-semibold">{item.label}</p>
                  <p className={`text-[11px] ${isDark ? "text-white/45" : "text-slate-500"}`}>{item.detail}</p>
                </div>
                {index <= activeStep - 2 ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <span className="voice-pipeline-dot" />
                )}
              </div>
            ))}
          </div>

          <p className={`text-center text-[11px] font-semibold ${isDark ? "text-white/40" : "text-slate-500"}`}>
            Pipeline complete · powered by StayNEP voice assistant
          </p>
        </div>
      </div>
    </div>
  );
}
