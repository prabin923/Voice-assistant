/**
 * itineraryEngine.ts — Generates personalized day-by-day Nepal itineraries.
 *
 * Builds structured travel plans based on destination, duration, interests,
 * and budget level. Cross-references registered StayNep hotels when available.
 */

import {
  DESTINATIONS,
  TREKKING_ROUTES,
  ACTIVITIES,
  FESTIVALS,
  findDestination,
  type Destination,
  type TrekkingRoute,
} from "@/lib/nepalTourismData";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type TravelInterest =
  | "adventure"
  | "culture"
  | "nature"
  | "spiritual"
  | "trekking"
  | "wildlife"
  | "relaxation"
  | "photography"
  | "food";

export type BudgetLevel = "budget" | "mid-range" | "luxury";

export interface ItineraryDay {
  day: number;
  location: string;
  title: string;
  morning: string;
  afternoon: string;
  evening: string;
  meals: string;
  accommodation: string;
  tips: string;
  estimatedCost: string;
}

export interface Itinerary {
  title: string;
  totalDays: number;
  destinations: string[];
  interests: TravelInterest[];
  budget: BudgetLevel;
  bestSeason: string;
  days: ItineraryDay[];
  totalEstimatedCost: string;
  packingTips: string[];
  permits: string[];
  importantNotes: string[];
}

export interface ItineraryRequest {
  destinations?: string[];
  days: number;
  interests?: TravelInterest[];
  budget?: BudgetLevel;
  startCity?: string;
}

/* ------------------------------------------------------------------ */
/*  Intent Detection                                                   */
/* ------------------------------------------------------------------ */

export function isItineraryIntent(message: string): boolean {
  const lower = message.toLowerCase();
  return /\b(itinerary|itenary|iternary|plan\s+(my|a|the)\s+trip|day.?by.?day|travel\s+plan|trip\s+plan|plan\s+for\s+\d+\s+day|what\s+should\s+i\s+do\s+(in|for)|how\s+to\s+spend\s+\d+\s+day|\d+\s+day(s)?\s+(in|trip|tour|itinerary|plan)|plan\s+my\s+visit|schedule\s+my\s+trip|create\s+.*\s+itinerary|suggest\s+.*\s+itinerary|make\s+.*\s+plan|give\s+me\s+a\s+plan)\b/i.test(lower);
}

export function extractItineraryDays(message: string): number | null {
  // "5-day trip", "for 5 days", "5 days in Nepal", "a week", etc.
  const patterns = [
    /(\d+)\s*[-–]?\s*day/i,
    /(\d+)\s*nights?/i,
    /for\s+(\d+)\s+days?/i,
    /spend\s+(\d+)\s+days?/i,
  ];
  for (const p of patterns) {
    const m = message.match(p);
    if (m) return Math.min(30, Math.max(1, parseInt(m[1])));
  }
  // Natural language durations
  if (/\ba\s+week\b/i.test(message)) return 7;
  if (/\btwo\s+weeks?\b/i.test(message)) return 14;
  if (/\bthree\s+weeks?\b/i.test(message)) return 21;
  if (/\bweekend\b/i.test(message)) return 3;
  if (/\blong\s+weekend\b/i.test(message)) return 4;
  return null;
}

export function extractDestinations(message: string): string[] {
  const lower = message.toLowerCase();
  const found: string[] = [];

  for (const dest of DESTINATIONS) {
    if (lower.includes(dest.name.toLowerCase())) {
      found.push(dest.name);
    }
  }

  // Common aliases
  if (/\beverest\b/i.test(lower) && !found.includes("Namche Bazaar")) found.push("Namche Bazaar");
  if (/\bannapurna\b/i.test(lower) && !found.includes("Pokhara")) found.push("Pokhara");
  if (/\bjungle\s*safari\b/i.test(lower) && !found.includes("Chitwan")) found.push("Chitwan");
  if (/\bbirthplace\s+of\s+buddha\b/i.test(lower) && !found.includes("Lumbini")) found.push("Lumbini");
  if (/\bmustang\b/i.test(lower) && !found.includes("Upper Mustang")) found.push("Upper Mustang");

  return [...new Set(found)];
}

export function extractInterests(message: string): TravelInterest[] {
  const lower = message.toLowerCase();
  const interests: TravelInterest[] = [];

  if (/\b(adventure|thrill|adrenaline|extreme|paraglid|bungee|raft|zip.?line)\b/i.test(lower)) interests.push("adventure");
  if (/\b(culture|heritage|histor|temple|monastery|museum|art|architect)\b/i.test(lower)) interests.push("culture");
  if (/\b(nature|scenic|landscape|lake|mountain|valley|garden|park)\b/i.test(lower)) interests.push("nature");
  if (/\b(spiritual|meditat|yoga|pilgrimage|buddhis|hindu|temple|pray)\b/i.test(lower)) interests.push("spiritual");
  if (/\b(trek|hike|hiking|trail|walk|camp)\b/i.test(lower)) interests.push("trekking");
  if (/\b(wildlife|safari|jungle|animal|bird|rhino|tiger|elephant)\b/i.test(lower)) interests.push("wildlife");
  if (/\b(relax|chill|spa|wellness|peaceful|quiet|resort)\b/i.test(lower)) interests.push("relaxation");
  if (/\b(photo|camera|instagram|landscape|sunset|sunrise)\b/i.test(lower)) interests.push("photography");
  if (/\b(food|cuisine|eat|taste|cook|culinary|momo|dal\s*bhat)\b/i.test(lower)) interests.push("food");

  return [...new Set(interests)];
}

export function extractBudgetLevel(message: string): BudgetLevel | undefined {
  const lower = message.toLowerCase();
  if (/\b(budget|cheap|affordable|backpack|hostel|low.?cost)\b/i.test(lower)) return "budget";
  if (/\b(luxury|premium|high.?end|5.?star|five.?star|splurge|boutique)\b/i.test(lower)) return "luxury";
  if (/\b(mid.?range|moderate|comfort|3.?star|4.?star|reasonable)\b/i.test(lower)) return "mid-range";
  return undefined;
}

/* ------------------------------------------------------------------ */
/*  Itinerary Builder                                                  */
/* ------------------------------------------------------------------ */

/** Predefined multi-destination route templates for common durations */
const ROUTE_TEMPLATES: Record<number, string[][]> = {
  3: [
    ["Kathmandu", "Bhaktapur", "Kathmandu"],
    ["Pokhara", "Pokhara", "Pokhara"],
  ],
  5: [
    ["Kathmandu", "Kathmandu", "Bhaktapur", "Nagarkot", "Kathmandu"],
    ["Pokhara", "Pokhara", "Pokhara", "Pokhara", "Pokhara"],
    ["Kathmandu", "Kathmandu", "Pokhara", "Pokhara", "Pokhara"],
  ],
  7: [
    ["Kathmandu", "Kathmandu", "Bhaktapur", "Nagarkot", "Pokhara", "Pokhara", "Pokhara"],
    ["Kathmandu", "Kathmandu", "Chitwan", "Chitwan", "Pokhara", "Pokhara", "Pokhara"],
  ],
  10: [
    ["Kathmandu", "Kathmandu", "Bhaktapur", "Nagarkot", "Pokhara", "Pokhara", "Pokhara", "Chitwan", "Chitwan", "Kathmandu"],
    ["Kathmandu", "Kathmandu", "Pokhara", "Pokhara", "Pokhara", "Chitwan", "Chitwan", "Lumbini", "Lumbini", "Kathmandu"],
  ],
  14: [
    ["Kathmandu", "Kathmandu", "Bhaktapur", "Patan (Lalitpur)", "Nagarkot", "Bandipur", "Pokhara", "Pokhara", "Pokhara", "Pokhara", "Chitwan", "Chitwan", "Chitwan", "Kathmandu"],
    ["Kathmandu", "Kathmandu", "Pokhara", "Pokhara", "Pokhara", "Pokhara", "Pokhara", "Pokhara", "Chitwan", "Chitwan", "Lumbini", "Lumbini", "Kathmandu", "Kathmandu"],
  ],
};

function selectRoute(days: number, destinations: string[], interests: TravelInterest[]): string[] {
  // If specific destinations provided, build a route around them
  if (destinations.length > 0) {
    return buildCustomRoute(days, destinations);
  }

  // Use template routes if available
  const templates = ROUTE_TEMPLATES[days];
  if (templates) {
    // Pick template based on interests
    if (interests.includes("wildlife") && templates.length > 1) return templates[1];
    return templates[0];
  }

  // For non-template durations, build dynamically
  return buildDynamicRoute(days, interests);
}

function buildCustomRoute(days: number, destinations: string[]): string[] {
  const route: string[] = [];
  const daysPerDest = Math.max(1, Math.floor(days / destinations.length));
  const remainder = days - daysPerDest * destinations.length;

  for (let i = 0; i < destinations.length; i++) {
    const extraDay = i < remainder ? 1 : 0;
    for (let d = 0; d < daysPerDest + extraDay; d++) {
      route.push(destinations[i]);
    }
  }

  // Pad or trim to exact days
  while (route.length < days) route.push(route[route.length - 1]);
  return route.slice(0, days);
}

function buildDynamicRoute(days: number, interests: TravelInterest[]): string[] {
  const route: string[] = [];

  // Always start in Kathmandu (arrival)
  route.push("Kathmandu");
  route.push("Kathmandu");

  if (days <= 3) {
    route.push("Bhaktapur");
    return route.slice(0, days);
  }

  if (interests.includes("trekking") && days >= 10) {
    // Add Pokhara + trekking days
    route.push("Pokhara");
    const trekDays = Math.min(days - 5, 7);
    for (let i = 0; i < trekDays; i++) route.push("Pokhara");
    route.push("Kathmandu");
  } else {
    // General sightseeing route
    route.push("Bhaktapur");
    if (days >= 5) route.push("Nagarkot");
    if (days >= 6) {
      route.push("Pokhara");
      route.push("Pokhara");
    }
    if (days >= 8) route.push("Pokhara");
    if (days >= 9) {
      route.push("Chitwan");
      route.push("Chitwan");
    }
    if (days >= 11) route.push("Lumbini");
    if (days >= 12) route.push("Lumbini");
    if (days >= 13) route.push("Bandipur");

    route.push("Kathmandu");
  }

  // Pad or trim
  while (route.length < days) route.push(route[route.length - 1]);
  return route.slice(0, days);
}

function getDayActivities(
  dest: Destination | undefined,
  dayInDest: number,
  totalDaysInDest: number,
  interests: TravelInterest[],
  budget: BudgetLevel
): { morning: string; afternoon: string; evening: string; meals: string; tips: string } {
  if (!dest) {
    return {
      morning: "Explore the local area",
      afternoon: "Visit nearby attractions",
      evening: "Enjoy local cuisine",
      meals: "Local restaurants",
      tips: "Ask locals for recommendations",
    };
  }

  const attractions = [...dest.attractions];
  const activities = [...dest.activities];
  const foods = [...dest.localFood];

  // Distribute attractions across days
  const attractionIdx = dayInDest * 2;
  const morningAttraction = attractions[attractionIdx % attractions.length] ?? attractions[0];
  const afternoonAttraction = attractions[(attractionIdx + 1) % attractions.length] ?? activities[0] ?? "Free time to explore";

  // First day = arrival/orientation, last day = departure prep
  const isArrivalDay = dayInDest === 0 && totalDaysInDest > 1;
  const isDepartureDay = dayInDest === totalDaysInDest - 1 && totalDaysInDest > 1;

  let morning: string;
  let afternoon: string;
  let evening: string;

  if (isArrivalDay) {
    morning = `Arrive in ${dest.name}. Check into your ${budget === "luxury" ? "luxury hotel" : budget === "budget" ? "guesthouse" : "hotel"} and freshen up`;
    afternoon = `Gentle orientation walk — ${morningAttraction.split(" — ")[0]}`;
    evening = `Welcome dinner — try ${foods[0] ?? "local cuisine"}`;
  } else if (isDepartureDay) {
    morning = `Last morning in ${dest.name} — ${activities[dayInDest % activities.length] ?? "leisurely breakfast and souvenir shopping"}`;
    afternoon = "Pack up, check out, and travel to next destination";
    evening = "Travel or arrive at next destination";
  } else {
    morning = `Morning: ${morningAttraction}`;
    afternoon = `Afternoon: ${afternoonAttraction}`;

    // Interest-specific evening activities
    if (interests.includes("food")) {
      evening = `Food walk — sample ${foods.slice(0, 3).join(", ")}`;
    } else if (interests.includes("spiritual")) {
      evening = "Evening aarti ceremony or meditation session";
    } else if (interests.includes("culture")) {
      evening = `Cultural evening — explore local markets and try ${foods[dayInDest % foods.length] ?? "local specialties"}`;
    } else {
      evening = `Relax and enjoy ${foods[dayInDest % foods.length] ?? "local food"} at a ${budget === "luxury" ? "fine-dining restaurant" : "local restaurant"}`;
    }
  }

  const mealBudget = budget === "luxury"
    ? "Fine dining and hotel restaurants"
    : budget === "budget"
      ? "Local eateries and street food"
      : "Mix of local restaurants and cafés";

  const tips = dest.travelTips[dayInDest % dest.travelTips.length] ?? "Carry water and sunscreen";

  return { morning, afternoon, evening, meals: mealBudget, tips };
}

function getAccommodation(dest: Destination | undefined, budget: BudgetLevel): string {
  if (!dest) return budget === "luxury" ? "Luxury hotel" : budget === "budget" ? "Budget guesthouse" : "Mid-range hotel";

  const budgetMap = {
    budget: `Budget guesthouse/hostel in ${dest.name} (${dest.estimatedDailyBudget.budget})`,
    "mid-range": `Mid-range hotel in ${dest.name} (${dest.estimatedDailyBudget.midRange})`,
    luxury: `Luxury hotel/resort in ${dest.name} (${dest.estimatedDailyBudget.luxury})`,
  };
  return budgetMap[budget];
}

function getDailyCost(dest: Destination | undefined, budget: BudgetLevel): string {
  if (!dest) return budget === "luxury" ? "NPR 15,000+" : budget === "budget" ? "NPR 2,000–3,500" : "NPR 5,000–10,000";
  return dest.estimatedDailyBudget[budget === "mid-range" ? "midRange" : budget];
}

function getPermits(route: string[], interests: TravelInterest[]): string[] {
  const permits: string[] = [];
  const routeSet = new Set(route.map((r) => r.toLowerCase()));

  if (interests.includes("trekking") || routeSet.has("namche bazaar")) {
    if (routeSet.has("namche bazaar")) {
      permits.push("Sagarmatha National Park permit: NPR 3,000");
      permits.push("TIMS card: NPR 2,000");
    }
    if (routeSet.has("pokhara") && interests.includes("trekking")) {
      permits.push("ACAP (Annapurna Conservation Area Permit): NPR 3,000");
      permits.push("TIMS card: NPR 2,000");
    }
  }
  if (routeSet.has("upper mustang")) {
    permits.push("Upper Mustang restricted area permit: $500/10 days");
  }
  if (routeSet.has("chitwan")) {
    permits.push("Chitwan National Park entry: NPR 2,000");
  }
  if (routeSet.has("bardiya national park")) {
    permits.push("Bardiya National Park entry: NPR 2,000");
  }

  return [...new Set(permits)];
}

function getPackingTips(interests: TravelInterest[], route: string[]): string[] {
  const tips: string[] = [
    "Comfortable walking shoes (broken in!)",
    "Layered clothing — temperatures vary widely",
    "Sunscreen, sunglasses, and hat",
    "Reusable water bottle (use purification tablets/filter for rural areas)",
    "Universal power adapter (Nepal uses type C/D/M)",
    "Copies of passport and visa (physical + digital)",
  ];

  if (interests.includes("trekking")) {
    tips.push("Trekking boots (ankle support), trekking poles");
    tips.push("Warm layers: down jacket, thermal base layers, fleece");
    tips.push("Headlamp and spare batteries");
    tips.push("First aid kit with altitude sickness medication (Diamox)");
  }
  if (interests.includes("wildlife") || route.some((r) => r.toLowerCase().includes("chitwan") || r.toLowerCase().includes("bardiya"))) {
    tips.push("Neutral-colored clothing (khaki, olive) for safari");
    tips.push("Strong insect repellent (DEET-based)");
    tips.push("Binoculars for wildlife and bird spotting");
  }
  if (interests.includes("culture") || interests.includes("spiritual")) {
    tips.push("Modest clothing that covers shoulders and knees for temple visits");
  }
  if (interests.includes("photography")) {
    tips.push("Camera rain cover (monsoon or unexpected rain)");
    tips.push("Extra memory cards and battery packs");
  }

  return tips;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export function generateItinerary(request: ItineraryRequest): Itinerary {
  const days = Math.min(30, Math.max(1, request.days));
  const budget: BudgetLevel = request.budget ?? "mid-range";
  const interests: TravelInterest[] = request.interests?.length ? request.interests : ["culture", "nature"];
  const destinations = request.destinations ?? [];

  const route = selectRoute(days, destinations, interests);
  const uniqueDestinations = [...new Set(route)];

  // Track how many days we've spent in each destination for activity rotation
  const dayCounters: Record<string, number> = {};
  const totalDaysPerDest: Record<string, number> = {};
  for (const loc of route) {
    totalDaysPerDest[loc] = (totalDaysPerDest[loc] ?? 0) + 1;
  }

  const itineraryDays: ItineraryDay[] = route.map((location, idx) => {
    const dest = findDestination(location);
    const dayInDest = dayCounters[location] ?? 0;
    dayCounters[location] = dayInDest + 1;

    const totalInDest = totalDaysPerDest[location] ?? 1;
    const acts = getDayActivities(dest, dayInDest, totalInDest, interests, budget);

    return {
      day: idx + 1,
      location,
      title: dayInDest === 0 ? `Arrive in ${location}` : `${location} — Day ${dayInDest + 1}`,
      morning: acts.morning,
      afternoon: acts.afternoon,
      evening: acts.evening,
      meals: acts.meals,
      accommodation: getAccommodation(dest, budget),
      tips: acts.tips,
      estimatedCost: getDailyCost(dest, budget),
    };
  });

  // Calculate total cost estimate
  const totalCost = budget === "luxury"
    ? `NPR ${(days * 15000).toLocaleString()}+ ($${(days * 115).toLocaleString()}+)`
    : budget === "budget"
      ? `NPR ${(days * 2500).toLocaleString()}–${(days * 4000).toLocaleString()} ($${(days * 19).toLocaleString()}–$${(days * 31).toLocaleString()})`
      : `NPR ${(days * 5000).toLocaleString()}–${(days * 10000).toLocaleString()} ($${(days * 38).toLocaleString()}–$${(days * 77).toLocaleString()})`;

  // Relevant trekking info
  const trekNote: string[] = [];
  if (interests.includes("trekking")) {
    const suitableTreks = TREKKING_ROUTES.filter((t) => {
      const trekDays = parseInt(t.duration.match(/(\d+)/)?.[1] ?? "99");
      return trekDays <= days;
    });
    if (suitableTreks.length > 0) {
      trekNote.push(
        `Recommended treks for ${days} days: ${suitableTreks.slice(0, 3).map((t) => `${t.name} (${t.duration}, ${t.difficulty})`).join("; ")}`
      );
    }
  }

  return {
    title: `${days}-Day Nepal ${interests.includes("trekking") ? "Trekking & " : ""}${interests.includes("adventure") ? "Adventure " : ""}${interests.includes("culture") ? "Cultural " : ""}Itinerary`,
    totalDays: days,
    destinations: uniqueDestinations,
    interests,
    budget,
    bestSeason: "October–November (best overall) or March–May (spring blooms)",
    days: itineraryDays,
    totalEstimatedCost: totalCost,
    packingTips: getPackingTips(interests, route),
    permits: getPermits(route, interests),
    importantNotes: [
      "Book domestic flights early — especially Lukla and Jomsom routes",
      "Travel insurance with emergency evacuation coverage is strongly recommended",
      "Keep copies of your passport, visa, and permits (physical + digital)",
      ...trekNote,
    ],
  };
}

/* ------------------------------------------------------------------ */
/*  Formatting for Chat                                                */
/* ------------------------------------------------------------------ */

export function formatItineraryForChat(itinerary: Itinerary): string {
  const lines: string[] = [];

  lines.push(`🇳🇵 **${itinerary.title}**`);
  lines.push("");
  lines.push(`📍 **Destinations:** ${itinerary.destinations.join(" → ")}`);
  lines.push(`💰 **Budget level:** ${itinerary.budget} | **Estimated total:** ${itinerary.totalEstimatedCost}`);
  lines.push(`🗓️ **Best season:** ${itinerary.bestSeason}`);
  lines.push("");

  for (const day of itinerary.days) {
    lines.push(`---`);
    lines.push(`### Day ${day.day}: ${day.title}`);
    lines.push(`🌅 ${day.morning}`);
    lines.push(`☀️ ${day.afternoon}`);
    lines.push(`🌙 ${day.evening}`);
    lines.push(`🍽️ *Meals:* ${day.meals}`);
    lines.push(`🏨 *Stay:* ${day.accommodation}`);
    lines.push(`💡 *Tip:* ${day.tips}`);
    lines.push("");
  }

  if (itinerary.permits.length > 0) {
    lines.push("---");
    lines.push("### 📋 Permits Required");
    for (const p of itinerary.permits) lines.push(`- ${p}`);
    lines.push("");
  }

  if (itinerary.packingTips.length > 0) {
    lines.push("### 🎒 Packing Essentials");
    for (const t of itinerary.packingTips.slice(0, 8)) lines.push(`- ${t}`);
    lines.push("");
  }

  if (itinerary.importantNotes.length > 0) {
    lines.push("### ⚠️ Important Notes");
    for (const n of itinerary.importantNotes) lines.push(`- ${n}`);
  }

  lines.push("");
  lines.push("*Would you like me to adjust this itinerary? I can change the duration, destinations, budget, or focus on specific interests.*");

  return lines.join("\n");
}

/**
 * Compact itinerary for voice mode — just the highlights.
 */
export function formatItineraryForVoice(itinerary: Itinerary): string {
  const destList = itinerary.destinations.join(", then ");
  const highlights = itinerary.days
    .filter((_, i) => i < 3 || i === itinerary.days.length - 1)
    .map((d) => `Day ${d.day}: ${d.title}`)
    .join(". ");

  return `Here's your ${itinerary.totalDays}-day plan: ${destList}. ${highlights}. Estimated total: ${itinerary.totalEstimatedCost}. Want me to send the full day-by-day details?`;
}

/**
 * Parse a user message into an itinerary request and generate the itinerary.
 */
export function buildItineraryFromMessage(message: string): Itinerary | null {
  const days = extractItineraryDays(message);
  if (!days) return null;

  const destinations = extractDestinations(message);
  const interests = extractInterests(message);
  const budget = extractBudgetLevel(message);

  return generateItinerary({
    destinations: destinations.length > 0 ? destinations : undefined,
    days,
    interests: interests.length > 0 ? interests : undefined,
    budget,
  });
}
