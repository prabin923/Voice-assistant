import Image from "next/image";

/** White-on-black stacked mark — dark UI (opaque matte stripped via screen blend) */
const SRC_DARK = "/logos/staynep-dark.png";
/** Stacked navy + gold mark (RGBA) — light / white UI */
const SRC_LIGHT = "/logos/staynep-light.png";

type Size = "sm" | "md" | "lg";

const sizeStyles: Record<
  Size,
  { wrap: string; img: string }
> = {
  sm: {
    wrap: "",
    img: "h-9 max-h-9 w-auto max-w-[120px]",
  },
  md: {
    wrap: "",
    img: "h-10 max-h-10 w-auto max-w-[150px] sm:h-11 sm:max-h-11 sm:max-w-[170px]",
  },
  lg: {
    wrap: "",
    img: "h-12 max-h-12 w-auto max-w-[190px] sm:h-14 sm:max-h-14 sm:max-w-[220px]",
  },
};

/**
 * Dark UI: inverted mark uses mix-blend-screen to drop residual matte on dark chrome.
 * Light UI: stacked color logo is RGBA — no multiply so navy/gold read true on pale backgrounds.
 */
export function StaynepLogo({
  isDark,
  size = "md",
  className = "",
  priority = false,
}: {
  isDark: boolean;
  size?: Size;
  className?: string;
  priority?: boolean;
}) {
  const s = sizeStyles[size];

  return (
    <span
      role="img"
      aria-label="StayNEP"
      className={`inline-flex select-none flex-col items-center justify-center ${s.wrap} ${className}`}
    >
      <Image
        src={isDark ? SRC_DARK : SRC_LIGHT}
        alt=""
        width={1024}
        height={1024}
        sizes="(max-width: 768px) 120px, 180px"
        priority={priority}
        className={`shrink-0 object-contain object-center ${isDark ? "mix-blend-screen" : ""} ${s.img}`}
      />
    </span>
  );
}
