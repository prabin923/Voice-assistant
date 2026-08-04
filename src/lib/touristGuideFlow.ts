/**
 * touristGuideFlow.ts — Intent router for Nepal tourism queries.
 *
 * Detects destination, itinerary, activity, practical, and culture intents
 * and returns grounded responses from the Nepal tourism knowledge base.
 * Falls through to the hotel directory for accommodation-specific queries.
 */

import {
  buildTourismKnowledgeBlock,
  buildTourismVoiceSummary,
  findDestination,
  findTrek,
  findActivity,
  findFestival,
  searchDestinations,
  searchTreks,
  searchActivities,
  searchFestivals,
  searchPracticalInfo,
  getAllDestinationNames,
  DESTINATIONS,
  TREKKING_ROUTES,
  ACTIVITIES,
  FESTIVALS,
  PRACTICAL_INFO,
} from "@/lib/nepalTourismData";
import {
  isItineraryIntent,
  buildItineraryFromMessage,
  formatItineraryForChat,
  formatItineraryForVoice,
  extractItineraryDays,
} from "@/lib/itineraryEngine";

type ChatChannel = "voice" | "text";

export interface TouristGuideResult {
  handled: boolean;
  reply?: string;
  /** If true, the caller should still pass through to the LLM with injected tourism context. */
  passToLlm?: boolean;
  /** Tourism knowledge block to inject into the LLM prompt. */
  tourismContext?: string;
}

/* ------------------------------------------------------------------ */
/*  Intent Detection                                                   */
/* ------------------------------------------------------------------ */

export function isTourismIntent(message: string): boolean {
  return (
    isDestinationIntent(message) ||
    isItineraryIntent(message) ||
    isActivityIntent(message) ||
    isPracticalInfoIntent(message) ||
    isFestivalIntent(message) ||
    isGeneralNepalTourismIntent(message)
  );
}

function isDestinationIntent(message: string): boolean {
  const lower = message.toLowerCase();

  // Direct destination name match
  for (const name of getAllDestinationNames()) {
    if (lower.includes(name.toLowerCase())) return true;
  }

  // Common aliases
  if (/\beverest\b/i.test(lower) && !/\bhotel\b/i.test(lower)) return true;
  if (/\bannapurna\b/i.test(lower) && !/\bhotel\b/i.test(lower)) return true;
  if (/\blangtang\b/i.test(lower)) return true;

  // "Tell me about [place]", "What to see in [place]"
  if (/\b(tell\s+me\s+about|what('s| is)\s+(in|at)|what\s+to\s+(see|do|visit)\s+(in|at)|describe|info\s+(about|on)|things\s+to\s+do\s+in|places?\s+to\s+visit\s+in|guide\s+to|about)\b/i.test(lower)) {
    // Check if any destination matches
    for (const name of getAllDestinationNames()) {
      if (lower.includes(name.toLowerCase())) return true;
    }
  }

  // "Best places in Nepal", "Where to go in Nepal"
  if (/\b(best\s+places?|where\s+to\s+go|top\s+destinations?|must\s+visit|popular\s+places?|beautiful\s+places?)\b/i.test(lower)) {
    return true;
  }

  return false;
}

function isActivityIntent(message: string): boolean {
  const lower = message.toLowerCase();

  // Direct activity names
  if (/\b(paraglid|bungee|raft|rafting|zip.?line|mountain\s*bik|safari|jungle\s*safari|helicopter\s+tour|yoga|meditation|cooking\s+class|heritage\s+tour|bird.?watch)\b/i.test(lower)) {
    return true;
  }

  // General activity queries
  if (/\b(adventure|things\s+to\s+do|activities|what\s+can\s+i\s+do|outdoor|extreme\s+sport)\b/i.test(lower)) {
    return true;
  }

  // Trekking queries
  if (/\b(trek|trekking|hike|hiking|trail|base\s*camp|poon\s*hill|mardi\s*himal|manaslu\s*circuit)\b/i.test(lower)) {
    return true;
  }

  return false;
}

function isPracticalInfoIntent(message: string): boolean {
  const lower = message.toLowerCase();
  return /\b(visa|permit|currency|money|atm|exchange\s+rate|rupee|tipping|sim\s+card|internet|wifi|altitude\s+sickness|health|vaccin|safety|emergency|custom|etiquette|transport|bus|flight|taxi|electricity|plug|adapter|language|nepali\s+phrases?|shopping|souvenir|when\s+to\s+visit|best\s+time|weather|monsoon|season)\b/i.test(lower);
}

function isFestivalIntent(message: string): boolean {
  const lower = message.toLowerCase();
  return /\b(festival|dashain|tihar|deepawali|holi|shivaratri|indra\s*jatra|bisket|buddha\s*jayanti|buddha\s*purnima|teej|chhath|celebration|holiday|cultural\s+event)\b/i.test(lower);
}

function isGeneralNepalTourismIntent(message: string): boolean {
  const lower = message.toLowerCase();
  return /\b(visit\s+nepal|travel\s+(to|in)\s+nepal|nepal\s+(travel|tourism|trip|tour|guide|vacation|holiday)|plan.+nepal|going\s+to\s+nepal|first\s+time\s+in\s+nepal|nepal\s+itinerary|explore\s+nepal|backpack.+nepal|honeymoon.+nepal)\b/i.test(lower);
}

/* ------------------------------------------------------------------ */
/*  Flow Handlers                                                      */
/* ------------------------------------------------------------------ */

export function handleTouristGuideFlow(
  message: string,
  channel: ChatChannel
): TouristGuideResult {
  // 1. Itinerary requests — handle directly with the engine
  if (isItineraryIntent(message)) {
    return handleItineraryRequest(message, channel);
  }

  // 2. All other tourism intents — inject knowledge into the LLM context
  //    Let the LLM compose a natural response using the grounding data.
  if (isTourismIntent(message)) {
    const tourismContext = buildTourismKnowledgeBlock(message);

    // If we found strong matching content, pass it to the LLM for a natural response
    if (tourismContext.length > 0) {
      return {
        handled: false,
        passToLlm: true,
        tourismContext,
      };
    }

    // For broad tourism queries, inject a summary of all destinations
    if (isGeneralNepalTourismIntent(message)) {
      const summary = buildGeneralNepalSummary(channel);
      return {
        handled: false,
        passToLlm: true,
        tourismContext: summary,
      };
    }
  }

  // Not a tourism intent — fall through
  return { handled: false };
}

function handleItineraryRequest(message: string, channel: ChatChannel): TouristGuideResult {
  const days = extractItineraryDays(message);

  if (!days) {
    // We know they want an itinerary but didn't specify days
    return {
      handled: true,
      reply: channel === "voice"
        ? "I'd love to plan your Nepal trip! How many days will you be here?"
        : "I'd love to plan your Nepal trip! 🇳🇵\n\nTo create a personalized itinerary, could you tell me:\n- **How many days** you'll be in Nepal?\n- **Interests** — adventure, culture, trekking, wildlife, relaxation?\n- **Budget level** — budget, mid-range, or luxury?\n\nOr just say something like \"Plan a 7-day cultural trip\" and I'll get started!",
    };
  }

  const itinerary = buildItineraryFromMessage(message);
  if (!itinerary) {
    return {
      handled: true,
      reply: channel === "voice"
        ? `A ${days}-day trip, great! What are you most interested in — adventure, culture, nature, or trekking?`
        : `A ${days}-day trip — exciting! What kind of experience are you looking for?\n\n- 🏔️ **Adventure** — trekking, paragliding, rafting\n- 🛕 **Culture** — temples, heritage, local festivals\n- 🌿 **Nature** — national parks, lakes, mountains\n- 🧘 **Spiritual** — meditation, monasteries, pilgrimage\n- 🍳 **Food** — cooking classes, local cuisine tours\n\nOr tell me specific places you want to visit!`,
    };
  }

  const reply = channel === "voice"
    ? formatItineraryForVoice(itinerary)
    : formatItineraryForChat(itinerary);

  return { handled: true, reply };
}

function buildGeneralNepalSummary(channel: ChatChannel): string {
  if (channel === "voice") {
    return `Nepal has incredible destinations. The top picks are Kathmandu for culture and history, Pokhara for adventure and mountains, Chitwan for jungle safaris, and Lumbini as the birthplace of Buddha. For trekking, the Everest Base Camp and Annapurna treks are world-famous. Best time to visit is October through November.`;
  }

  const topDests = DESTINATIONS.slice(0, 8);
  const destList = topDests.map(
    (d) => `- **${d.name}** (${d.region}, ${d.elevation}): ${d.description.slice(0, 80)}... Best time: ${d.bestTimeToVisit}. Recommended stay: ${d.stayDuration}.`
  ).join("\n");

  const topTreks = TREKKING_ROUTES.slice(0, 4).map(
    (t) => `- **${t.name}**: ${t.difficulty}, ${t.duration}, max ${t.maxAltitude}`
  ).join("\n");

  const topActivities = ACTIVITIES.slice(0, 5).map(
    (a) => `- **${a.name}** (${a.category}): ${a.description.slice(0, 60)}...`
  ).join("\n");

  return `NEPAL TOURISM OVERVIEW:

TOP DESTINATIONS:
${destList}

POPULAR TREKS:
${topTreks}

TOP ACTIVITIES:
${topActivities}

BEST TIME TO VISIT: October–November (autumn, clear skies, festivals). March–May (spring, rhododendrons).
VISA: On arrival at Kathmandu airport — 15-day ($30), 30-day ($50), 90-day ($125).
CURRENCY: Nepali Rupee (NPR). ~130 NPR = 1 USD.`;
}

/**
 * Build tourism knowledge to inject alongside the hotel directory
 * in the StayNep system prompt. This is called for every message
 * to provide general tourism awareness.
 */
export function buildTourismSystemContext(): string {
  const destNames = DESTINATIONS.map((d) => d.name).join(", ");
  const trekNames = TREKKING_ROUTES.map((t) => t.name).join(", ");
  const activityNames = ACTIVITIES.map((a) => a.name).join(", ");

  return `NEPAL TOURISM KNOWLEDGE:
You have detailed knowledge about these Nepal destinations: ${destNames}.
You know these trekking routes: ${trekNames}.
You can recommend these activities: ${activityNames}.
You can generate day-by-day itineraries for trips of any length.
You know about Nepal's festivals (Dashain, Tihar, Holi, etc.), visa requirements, trekking permits, altitude sickness, local customs, currency, transportation, and practical travel tips.

When tourists ask about places to visit, things to do, or trip planning — answer confidently and helpfully from this knowledge. Recommend StayNep hotels when relevant to their destination.`;
}
