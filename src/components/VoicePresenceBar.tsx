"use client";

type VoicePresenceBarProps = {
  active: boolean;
  mode: "idle" | "listening" | "speaking" | "thinking";
  accentColor?: string;
  className?: string;
};

const BAR_COUNT = 24;

export function VoicePresenceBar({
  active,
  mode,
  accentColor = "#de94e2",
  className = "",
}: VoicePresenceBarProps) {
  return (
    <div
      className={`flex items-end justify-center gap-[3px] ${className}`}
      style={{ height: 32 }}
      aria-hidden
    >
      {Array.from({ length: BAR_COUNT }, (_, i) => {
        const delay = `${(i % 8) * 0.07}s`;
        const height =
          mode === "idle" ? 18 + (i % 5) * 4 : 12 + ((i * 7) % 11) * 5;
        return (
          <div
            key={i}
            className={`w-[3px] rounded-full origin-bottom transition-colors duration-300 ${
              active ? "voice-presence-bar-active" : "opacity-30"
            }`}
            style={{
              height: `${height}%`,
              backgroundColor: accentColor,
              animationDelay: delay,
              opacity: active ? 0.35 + (i % 4) * 0.15 : 0.2,
            }}
          />
        );
      })}
    </div>
  );
}
