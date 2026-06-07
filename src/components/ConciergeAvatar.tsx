"use client";

type ConciergeAvatarProps = {
  name: string;
  accentColor?: string;
  size?: "sm" | "md" | "lg";
  isDark?: boolean;
  className?: string;
};

const SIZE_CLASSES = {
  sm: "h-8 w-8 text-[11px] rounded-xl",
  md: "h-16 w-16 text-2xl rounded-2xl",
  lg: "w-28 h-28 text-4xl rounded-full",
} as const;

export function ConciergeAvatar({
  name,
  accentColor = "#de94e2",
  size = "sm",
  isDark = true,
  className = "",
}: ConciergeAvatarProps) {
  const initial = (name.trim().charAt(0) || "C").toUpperCase();

  return (
    <div
      className={`flex shrink-0 items-center justify-center font-semibold tracking-tight border ${SIZE_CLASSES[size]} ${className} ${
        isDark ? "border-white/10 text-white" : "border-neutral-200 text-neutral-800"
      }`}
      style={{
        background: `linear-gradient(145deg, ${accentColor}44, rgba(var(--hotel-accent-rgb, 222 148 226), 0.12))`,
        boxShadow: `0 0 0 1px ${accentColor}33`,
      }}
      aria-hidden
    >
      {initial}
    </div>
  );
}
