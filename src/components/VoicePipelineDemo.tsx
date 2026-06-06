"use client";

import { useEffect, useState } from "react";
import { Check, Globe2, Mic, PhoneCall } from "lucide-react";

const PIPELINE_LINES = [
  { time: "00:04", text: "Do you have a late check-in option tonight?" },
  { time: "00:07", text: "Yes — check-in starts at 3 PM, but we can arrange a late arrival." },
  { time: "00:11", text: "Can someone meet me at the airport?" },
];

const STEPS = ["Capture", "Transcribe", "Reply", "Escalate"] as const;

export function VoicePipelineDemo() {
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

  return (
    <div className="vapi-code-block relative overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-iron-border pb-4">
        <span className="vapi-nav-label text-zinc-mute">Live concierge pipeline</span>
        <span className="rounded-[5.6px] border border-iron-border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-mercury-text">
          EN · 284ms
        </span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.92fr]">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {[
              { icon: Mic, label: "Tap to speak" },
              { icon: PhoneCall, label: "Concierge call" },
              { icon: Globe2, label: "34+ languages" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-[5.6px] border border-iron-border bg-slab-elevated px-3 py-2 font-mono text-xs text-bone-text"
              >
                <Icon className="h-3.5 w-3.5 text-ice-border" strokeWidth={1.5} />
                {label}
              </div>
            ))}
          </div>

          <div className="rounded-[5.6px] border border-iron-border bg-carbon-surface p-4">
            <p className="vapi-nav-label text-zinc-mute">Live transcript</p>
            <div className="mt-3 space-y-2 font-mono text-[12px] leading-relaxed">
              {PIPELINE_LINES.slice(0, lineIndex).map((line) => (
                <p key={line.time} className="text-mercury-text">
                  <span className="text-zinc-mute">{line.time}</span> {line.text}
                </p>
              ))}
              <p className="text-cream-text">
                <span className="text-zinc-mute">{PIPELINE_LINES[lineIndex]?.time}</span> {visibleText}
                <span className="voice-pipeline-cursor" />
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-[5.6px] border border-iron-border bg-carbon-surface p-3">
              <p className="vapi-nav-label text-zinc-mute">Intent</p>
              <p className="mt-1.5 text-sm font-medium text-cream-text">Late check-in</p>
            </div>
            <div className="rounded-[5.6px] border border-iron-border bg-carbon-surface p-3">
              <p className="vapi-nav-label text-zinc-mute">Policy match</p>
              <p className="mt-1.5 text-sm font-medium text-cream-text">Check-in 3 PM</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-1.5">
            {STEPS.map((step, index) => (
              <div
                key={step}
                className={`rounded-[5.6px] border px-2 py-2 text-center transition-colors duration-500 ${
                  index === activeStep
                    ? "border-steel-border bg-slab-elevated text-cream-text"
                    : "border-iron-border bg-carbon-surface text-zinc-mute"
                }`}
              >
                <p className="font-mono text-[9px] uppercase tracking-wider">Step {index + 1}</p>
                <p className="mt-0.5 text-[11px] font-medium">{step}</p>
              </div>
            ))}
          </div>

          <div className="rounded-[5.6px] border border-iron-border bg-carbon-surface p-4">
            <p className="vapi-nav-label text-zinc-mute">Assistant reply</p>
            <p className="mt-2 text-sm leading-6 text-bone-text">
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
                className={`flex items-center justify-between rounded-[5.6px] border border-iron-border bg-carbon-surface px-3 py-2.5 transition-opacity duration-500 ${
                  index <= activeStep - 2 ? "opacity-100" : "opacity-55"
                }`}
              >
                <div>
                  <p className="text-xs font-medium text-cream-text">{item.label}</p>
                  <p className="text-[11px] text-zinc-mute">{item.detail}</p>
                </div>
                {index <= activeStep - 2 ? (
                  <Check className="h-4 w-4 text-mint-pulse" strokeWidth={1.5} />
                ) : (
                  <span className="voice-pipeline-dot" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
