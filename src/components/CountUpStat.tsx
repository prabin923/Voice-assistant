"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function parseStatValue(value: string) {
  if (/^\d+\/\d+$/.test(value)) {
    const [head, tail] = value.split("/");
    return { prefix: "", target: Number(head), suffix: `/${tail}` };
  }
  const match = value.match(/^([<>=]?)(\d+)(.*)$/);
  if (match) {
    return { prefix: match[1], target: Number(match[2]), suffix: match[3] };
  }
  return { prefix: "", target: null as number | null, suffix: value };
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

type CountUpStatProps = {
  value: string;
  label: string;
  durationMs?: number;
};

export function CountUpStat({ value, label, durationMs = 1400 }: CountUpStatProps) {
  const ref = useRef<HTMLDivElement>(null);
  const parsed = useMemo(() => parseStatValue(value), [value]);
  const [count, setCount] = useState(0);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || parsed.target === null) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [parsed.target]);

  useEffect(() => {
    if (!active || parsed.target === null) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCount(parsed.target);
      return;
    }

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      setCount(Math.round(easeOutCubic(progress) * parsed.target!));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, parsed.target, durationMs]);

  const display =
    parsed.target === null ? value : `${parsed.prefix}${count}${parsed.suffix}`;

  return (
    <div ref={ref}>
      <p
        className="vapi-headline font-mono text-4xl tabular-nums tracking-tight text-cream-text"
        aria-label={value}
      >
        {display}
      </p>
      <p className="mt-2 font-mono text-xs uppercase tracking-[0.08em] text-zinc-mute">{label}</p>
    </div>
  );
}
