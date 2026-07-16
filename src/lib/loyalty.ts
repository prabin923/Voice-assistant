/** Guest loyalty tiers and perks — uses existing visitCount/bookingCount on Guest. */

export type LoyaltyTier = "bronze" | "silver" | "gold" | "platinum";

export interface LoyaltyPerks {
  tier: LoyaltyTier;
  label: string;
  discountPercent: number;
  perks: string[];
  nextTier?: { name: string; bookingsNeeded: number };
}

const TIER_THRESHOLDS: { tier: LoyaltyTier; minBookings: number }[] = [
  { tier: "platinum", minBookings: 10 },
  { tier: "gold", minBookings: 5 },
  { tier: "silver", minBookings: 2 },
  { tier: "bronze", minBookings: 0 },
];

const TIER_CONFIG: Record<LoyaltyTier, { label: string; discountPercent: number; perks: string[] }> = {
  bronze: {
    label: "Bronze",
    discountPercent: 0,
    perks: ["Welcome drink on arrival", "Free WiFi"],
  },
  silver: {
    label: "Silver",
    discountPercent: 5,
    perks: ["5% discount on room rates", "Late checkout until 1 PM", "Welcome drink on arrival", "Free WiFi"],
  },
  gold: {
    label: "Gold",
    discountPercent: 10,
    perks: ["10% discount on room rates", "Complimentary late checkout until 2 PM", "Room upgrade (subject to availability)", "Welcome drink on arrival", "Free WiFi", "Priority support"],
  },
  platinum: {
    label: "Platinum",
    discountPercent: 15,
    perks: ["15% discount on room rates", "Complimentary late checkout until 3 PM", "Guaranteed room upgrade", "Free spa treatment per stay", "Welcome drink on arrival", "Free WiFi", "Priority support", "Complimentary airport transfer"],
  },
};

export function getLoyaltyTier(bookingCount: number): LoyaltyTier {
  for (const { tier, minBookings } of TIER_THRESHOLDS) {
    if (bookingCount >= minBookings) return tier;
  }
  return "bronze";
}

export function getLoyaltyPerks(bookingCount: number): LoyaltyPerks {
  const tier = getLoyaltyTier(bookingCount);
  const config = TIER_CONFIG[tier];
  
  // Find next tier
  const currentIndex = TIER_THRESHOLDS.findIndex((t) => t.tier === tier);
  const nextTierDef = currentIndex > 0 ? TIER_THRESHOLDS[currentIndex - 1] : undefined;
  
  return {
    tier,
    label: config.label,
    discountPercent: config.discountPercent,
    perks: config.perks,
    nextTier: nextTierDef
      ? { name: TIER_CONFIG[nextTierDef.tier].label, bookingsNeeded: nextTierDef.minBookings - bookingCount }
      : undefined,
  };
}

export function applyLoyaltyDiscount(price: number, bookingCount: number): { discountedPrice: number; discountPercent: number; savings: number } {
  const perks = getLoyaltyPerks(bookingCount);
  const savings = Math.round(price * perks.discountPercent / 100);
  return {
    discountedPrice: price - savings,
    discountPercent: perks.discountPercent,
    savings,
  };
}

export function loyaltySystemPromptFragment(bookingCount: number, guestName: string): string {
  const perks = getLoyaltyPerks(bookingCount);
  if (perks.tier === "bronze") {
    return `${guestName} is a new guest (Bronze tier). Welcome them warmly.`;
  }
  const perksList = perks.perks.slice(0, 3).join(", ");
  const nextInfo = perks.nextTier
    ? ` They need ${perks.nextTier.bookingsNeeded} more booking(s) to reach ${perks.nextTier.name}.`
    : " They are at the highest tier!";
  return `${guestName} is a valued ${perks.label} loyalty member (${bookingCount} stays). Their perks include: ${perksList}. Mention their status naturally when relevant (e.g. "As a ${perks.label} member, you enjoy ${perks.perks[0]}").${nextInfo}`;
}

export const TIER_COLORS: Record<LoyaltyTier, string> = {
  bronze: "#cd7f32",
  silver: "#c0c0c0",
  gold: "#ffd700",
  platinum: "#e5e4e2",
};

export const TIER_ICONS: Record<LoyaltyTier, string> = {
  bronze: "🥉",
  silver: "🥈",
  gold: "🥇",
  platinum: "💎",
};
