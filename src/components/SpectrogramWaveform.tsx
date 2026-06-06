"use client";

const SPECTROGRAM_COLORS = [
  "#4dcafa",
  "#de94e2",
  "#ffdd03",
  "#9977ff",
  "#62f6b5",
  "#e96b34",
] as const;

/** Precomputed waveform heights (0–1) for a natural audio amplitude shape */
const WAVE_HEIGHTS = [
  0.12, 0.18, 0.25, 0.32, 0.28, 0.35, 0.42, 0.55, 0.48, 0.62, 0.72, 0.85, 0.78, 0.92, 1,
  0.88, 0.95, 0.82, 0.68, 0.75, 0.58, 0.65, 0.48, 0.55, 0.42, 0.38, 0.52, 0.45, 0.35, 0.28,
  0.32, 0.22, 0.18, 0.25, 0.15, 0.2, 0.12, 0.08, 0.15, 0.22, 0.18, 0.28, 0.35, 0.42, 0.38,
  0.52, 0.62, 0.58, 0.72, 0.65, 0.78, 0.85, 0.72, 0.68, 0.55, 0.48, 0.42, 0.35, 0.28, 0.22,
  0.18, 0.25, 0.32, 0.28, 0.38, 0.45, 0.52, 0.48, 0.62, 0.55, 0.42, 0.35, 0.28, 0.22, 0.15,
  0.12, 0.18, 0.25, 0.32, 0.28, 0.35, 0.42, 0.55, 0.48, 0.62, 0.72, 0.85, 0.78, 0.92, 1,
  0.88, 0.75, 0.68, 0.55, 0.48, 0.42, 0.35, 0.28, 0.22, 0.18, 0.15, 0.12, 0.08, 0.12, 0.18,
];

type SpectrogramWaveformProps = {
  barCount?: number;
  className?: string;
};

export function SpectrogramWaveform({ barCount = 96, className = "" }: SpectrogramWaveformProps) {
  const bars = Array.from({ length: barCount }, (_, i) => ({
    height: WAVE_HEIGHTS[i % WAVE_HEIGHTS.length],
    color: SPECTROGRAM_COLORS[i % SPECTROGRAM_COLORS.length],
  }));

  return (
    <div
      className={`flex w-full items-end gap-[3px] px-4 sm:px-6 ${className}`}
      style={{ height: "clamp(48px, 8vw, 72px)" }}
      aria-hidden
    >
      {bars.map((bar, i) => (
        <div
          key={i}
          data-gsap="wave-bar"
          className="vapi-spectrogram-bar"
          style={{
            height: `${Math.max(8, bar.height * 100)}%`,
            backgroundColor: bar.color,
          }}
        />
      ))}
    </div>
  );
}
