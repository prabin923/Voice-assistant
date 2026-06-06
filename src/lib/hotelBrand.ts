import type { BrandingConfig, HotelConfig } from "@/lib/hotelConfig";

export const HOTEL_CONFIG_UPDATED_EVENT = "hotel-config-updated";

const DEFAULT_BRANDING: BrandingConfig = {
  hotelName: "Willow Hotel",
  tagline: "Your 24/7 Virtual AI Receptionist",
  accentColor: "#c9a227",
  welcomeMessage: "Welcome to Willow Hotel! How can I assist you with your stay today?",
  farewellMessage: "Thank you for choosing Willow Hotel. Have a wonderful day!",
};

export function defaultWelcomeMessage(hotelName: string): string {
  const name = hotelName.trim() || "Your Hotel";
  return `Welcome to ${name}! How can I assist you with your stay today?`;
}

export function defaultFarewellMessage(hotelName: string): string {
  const name = hotelName.trim() || "Your Hotel";
  return `Thank you for choosing ${name}. Have a wonderful day!`;
}

/** Replace the previous hotel name inside welcome/farewell when the name changes in settings. */
export function syncBrandingOnHotelRename(
  prevName: string,
  nextName: string,
  branding: BrandingConfig,
): BrandingConfig {
  const trimmedPrev = prevName.trim();
  const trimmedNext = nextName.trim();
  if (!trimmedNext || trimmedPrev === trimmedNext) {
    return { ...branding, hotelName: trimmedNext || branding.hotelName };
  }

  const next = { ...branding, hotelName: trimmedNext };
  const welcome = branding.welcomeMessage?.trim() ?? "";
  const farewell = branding.farewellMessage?.trim() ?? "";

  if (
    !welcome ||
    welcome === defaultWelcomeMessage(trimmedPrev) ||
    (trimmedPrev && welcome.includes(trimmedPrev))
  ) {
    next.welcomeMessage = defaultWelcomeMessage(trimmedNext);
  }

  if (
    !farewell ||
    farewell === defaultFarewellMessage(trimmedPrev) ||
    (trimmedPrev && farewell.includes(trimmedPrev))
  ) {
    next.farewellMessage = defaultFarewellMessage(trimmedNext);
  }

  return next;
}

/** Headline for guest-facing screens — always the configured hotel name. */
export function getGuestWelcomeHeadline(branding: BrandingConfig): string {
  return branding.hotelName?.trim() || "Your Hotel";
}

/** Subtext after the hotel name — strips a redundant "Welcome to {name}" prefix if present. */
export function getGuestWelcomeSubtext(branding: BrandingConfig): string {
  const name = branding.hotelName?.trim();
  const welcome = branding.welcomeMessage?.trim() || defaultWelcomeMessage(name || "Your Hotel");
  const fallback = "How can I assist you with your stay today?";

  if (!name) return welcome;

  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!new RegExp(escaped, "i").test(welcome)) {
    return fallback;
  }

  const withoutPrefix = welcome
    .replace(new RegExp(`^Welcome to\\s+${escaped}!?\\s*`, "i"), "")
    .replace(new RegExp(`^Welcome to\\s+${escaped}\\s*`, "i"), "")
    .trim();

  return withoutPrefix || fallback;
}

const DEFAULT_SUGGESTED_QUESTIONS = [
  "What time is check-in and check-out?",
  "Do you have a swimming pool or gym?",
  "Can you arrange airport pickup?",
  "What room types do you offer?",
  "What's your cancellation policy?",
  "I'd like to speak to the front desk",
];

export type PublicHotelConfig = Pick<
  HotelConfig,
  "branding" | "customFAQ" | "policies" | "amenities" | "rooms" | "voiceStyle" | "language"
> & {
  aiReady?: boolean;
  sttReady?: boolean;
  geminiLiveReady?: boolean;
};

export const DEFAULT_PUBLIC_HOTEL_CONFIG: PublicHotelConfig = {
  branding: DEFAULT_BRANDING,
  customFAQ: [
    { question: "airport shuttle", answer: "We offer complimentary airport shuttle service." },
    { question: "laundry", answer: "Laundry and dry cleaning services are available." },
  ],
  policies: {
    checkInTime: "3:00 PM",
    checkOutTime: "11:00 AM",
    cancellationPolicy: "Free cancellation up to 24 hours before check-in.",
    petPolicy: "Pets are welcome with prior notice.",
    smokingPolicy: "All indoor areas are non-smoking.",
    extraBedPolicy: "Extra beds are available upon request.",
    childPolicy: "Children under 12 stay free when using existing bedding.",
  },
  amenities: [
    { name: "Swimming Pool", description: "Indoor heated pool for guests.", hours: "6 AM - 10 PM" },
    { name: "Fitness Center", description: "Fully equipped gym.", hours: "24/7" },
  ],
  rooms: [
    {
      name: "Standard Room",
      category: "Classic",
      imageUrl: "https://picsum.photos/seed/willow-standard-room/600/400",
      pricePerNight: 120,
      currency: "USD",
      description: "Comfortable room with essential amenities.",
      maxOccupancy: 2,
    },
  ],
  voiceStyle: "warm",
  language: "en-US",
};

function hexToRgb(hex: string): [number, number, number] {
  const raw = hex.trim().replace("#", "");
  const normalized =
    raw.length === 3
      ? raw.split("").map((c) => c + c).join("")
      : raw.length === 6
        ? raw
        : "c9a227";
  const value = Number.parseInt(normalized, 16);
  if (Number.isNaN(value)) return [201, 162, 39];
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgbToCss([r, g, b]: [number, number, number]): string {
  return `${r}, ${g}, ${b}`;
}

function mixRgb(
  a: [number, number, number],
  b: [number, number, number],
  amount: number
): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * amount),
    Math.round(a[1] + (b[1] - a[1]) * amount),
    Math.round(a[2] + (b[2] - a[2]) * amount),
  ];
}

/** Push hotel accent through the shared design tokens used by assistant CSS. */
export function applyHotelBrandTheme(branding: BrandingConfig): void {
  if (typeof document === "undefined") return;

  const accent = hexToRgb(branding.accentColor || DEFAULT_BRANDING.accentColor);
  const bright = mixRgb(accent, [255, 255, 255], 0.28);
  const navy = mixRgb(accent, [8, 28, 51], 0.68);
  const spark = mixRgb(accent, [110, 164, 199], 0.38);
  const accentHex = branding.accentColor || DEFAULT_BRANDING.accentColor;

  const root = document.documentElement;
  root.style.setProperty("--hotel-accent", accentHex);
  root.style.setProperty("--hotel-accent-rgb", rgbToCss(accent));
  root.style.setProperty("--hotel-accent-bright-rgb", rgbToCss(bright));
  root.style.setProperty("--hotel-accent-deep-rgb", rgbToCss(navy));
  root.style.setProperty("--accent-gold-rgb", rgbToCss(accent));
  root.style.setProperty("--accent-navy-rgb", rgbToCss(navy));
  root.style.setProperty("--accent-spark-rgb", rgbToCss(spark));
  root.style.setProperty("--primary", accentHex);
  root.style.setProperty("--primary-glow", `rgba(${rgbToCss(bright)}, 0.45)`);
  root.style.setProperty("--staynep-gold", accentHex);
  root.style.setProperty("--staynep-gold-bright", `rgb(${rgbToCss(bright)})`);
}

export function notifyHotelConfigUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(HOTEL_CONFIG_UPDATED_EVENT));
}

function formatFaqAsQuestion(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  const text = raw.trim();
  if (text.endsWith("?")) return text.charAt(0).toUpperCase() + text.slice(1);
  return `Can you tell me about ${text}?`;
}

export function buildSuggestedQuestions(
  config: Pick<HotelConfig, "customFAQ" | "policies" | "amenities" | "rooms">
): string[] {
  const fromFaq = (config.customFAQ ?? [])
    .map((item) => formatFaqAsQuestion(item.question))
    .filter((q): q is string => Boolean(q))
    .slice(0, 3);

  const dynamic: string[] = [];
  if (config.policies?.checkInTime || config.policies?.checkOutTime) {
    dynamic.push("What time is check-in and check-out?");
  }
  if (config.amenities?.length) {
    const names = config.amenities.slice(0, 2).map((a) => a.name.toLowerCase());
    if (names.length === 1) dynamic.push(`Do you have a ${names[0]}?`);
    else if (names.length > 1) dynamic.push(`Do you have ${names[0]} or ${names[1]}?`);
  }
  if (config.rooms?.length) {
    dynamic.push("What room types do you offer?");
  }
  if (config.policies?.cancellationPolicy) {
    dynamic.push("What's your cancellation policy?");
  }

  const seen = new Set<string>();
  const merged: string[] = [];
  for (const question of [...fromFaq, ...dynamic, ...DEFAULT_SUGGESTED_QUESTIONS]) {
    const key = question.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(question);
    if (merged.length >= 6) break;
  }
  return merged;
}

export function mergePublicHotelConfig(data: Partial<PublicHotelConfig> | null | undefined): PublicHotelConfig {
  return {
    branding: { ...DEFAULT_PUBLIC_HOTEL_CONFIG.branding, ...data?.branding },
    customFAQ: data?.customFAQ ?? DEFAULT_PUBLIC_HOTEL_CONFIG.customFAQ,
    policies: { ...DEFAULT_PUBLIC_HOTEL_CONFIG.policies, ...data?.policies },
    amenities: data?.amenities ?? DEFAULT_PUBLIC_HOTEL_CONFIG.amenities,
    rooms: data?.rooms ?? DEFAULT_PUBLIC_HOTEL_CONFIG.rooms,
    voiceStyle: data?.voiceStyle ?? DEFAULT_PUBLIC_HOTEL_CONFIG.voiceStyle,
    language: data?.language ?? DEFAULT_PUBLIC_HOTEL_CONFIG.language,
    aiReady: data?.aiReady,
    sttReady: data?.sttReady,
    geminiLiveReady: data?.geminiLiveReady,
  };
}
