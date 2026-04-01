// ============================================================
// UNIVERSAL RESPONSE ENGINE — MULTI-LANGUAGE
// ============================================================
// Generates AI receptionist replies dynamically based on the
// current hotel configuration AND selected language.
// ============================================================

import { HotelConfig } from './hotelConfig';
import { IntentKey, getKeywordsForLanguage, getTemplatesForLanguage } from './languages';

// ============================================================
// INTENT DETECTION — language-aware
// ============================================================

interface DetectedIntent {
  intent: IntentKey | "unknown" | "faq";
  confidence: number;
}

function detectIntent(message: string, langCode: string): DetectedIntent {
  const lower = message.toLowerCase();
  const keywords = getKeywordsForLanguage(langCode);

  let bestIntent: IntentKey | "unknown" = "unknown";
  let bestScore = 0;

  for (const [intent, kws] of Object.entries(keywords) as [IntentKey, string[]][]) {
    let score = 0;
    for (const kw of kws) {
      if (lower.includes(kw)) {
        score += kw.length; // longer matches score higher
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
    }
  }

  return { intent: bestIntent, confidence: bestScore };
}

function checkCustomFAQ(message: string, config: HotelConfig): string | null {
  const lower = message.toLowerCase();
  for (const faq of config.customFAQ) {
    if (lower.includes(faq.question.toLowerCase())) {
      return faq.answer;
    }
  }
  return null;
}

// ============================================================
// TEMPLATE FILLER
// ============================================================

function fill(template: string, vars: Record<string, string | number>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
  }
  return result;
}

// ============================================================
// RESPONSE BUILDERS — language-aware
// ============================================================

function buildGreeting(config: HotelConfig, langCode: string): string {
  const t = getTemplatesForLanguage(langCode);
  return fill(t.greeting, { hotel: config.branding.hotelName });
}

function buildBookingResponse(config: HotelConfig, langCode: string): string {
  const t = getTemplatesForLanguage(langCode);
  const cheapest = config.rooms.reduce((min, r) => r.pricePerNight < min.pricePerNight ? r : min, config.rooms[0]);
  return fill(t.bookingOffer, {
    hotel: config.branding.hotelName,
    roomCount: config.rooms.length,
    currency: cheapest.currency,
    cheapest: cheapest.pricePerNight,
    cheapestName: cheapest.name,
  });
}

function buildRoomInfoResponse(config: HotelConfig, langCode: string): string {
  const t = getTemplatesForLanguage(langCode);
  const header = fill(t.roomListHeader, { hotel: config.branding.hotelName });
  const roomList = config.rooms.map(r =>
    `• ${r.name} — ${r.currency} ${r.pricePerNight}/night (max ${r.maxOccupancy}): ${r.description}`
  ).join("\n");
  return `${header}\n${roomList}\n${t.roomListFooter}`;
}

function buildPricingResponse(config: HotelConfig, langCode: string): string {
  const t = getTemplatesForLanguage(langCode);
  const cheapest = config.rooms.reduce((min, r) => r.pricePerNight < min.pricePerNight ? r : min, config.rooms[0]);
  const expensive = config.rooms.reduce((max, r) => r.pricePerNight > max.pricePerNight ? r : max, config.rooms[0]);
  return fill(t.pricingRange, {
    hotel: config.branding.hotelName,
    currency: cheapest.currency,
    cheapest: cheapest.pricePerNight,
    cheapestName: cheapest.name,
    expensive: expensive.pricePerNight,
    expensiveName: expensive.name,
  });
}

function buildCheckInResponse(config: HotelConfig, langCode: string): string {
  const t = getTemplatesForLanguage(langCode);
  return fill(t.checkIn, { hotel: config.branding.hotelName, time: config.policies.checkInTime });
}

function buildCheckOutResponse(config: HotelConfig, langCode: string): string {
  const t = getTemplatesForLanguage(langCode);
  return fill(t.checkOut, { hotel: config.branding.hotelName, time: config.policies.checkOutTime });
}

function buildDiningResponse(config: HotelConfig, langCode: string): string {
  const t = getTemplatesForLanguage(langCode);
  if (config.dining.length === 0) {
    return fill(t.diningEmpty, { hotel: config.branding.hotelName });
  }
  const header = fill(t.diningHeader, { hotel: config.branding.hotelName });
  const venueList = config.dining.map(d =>
    `• ${d.name} (${d.cuisine}) — ${d.hours}: ${d.description}`
  ).join("\n");
  return `${header}\n${venueList}\n${t.diningFooter}`;
}

function buildAmenitiesResponse(config: HotelConfig, langCode: string): string {
  const t = getTemplatesForLanguage(langCode);
  if (config.amenities.length === 0) {
    return fill(t.amenitiesEmpty, { hotel: config.branding.hotelName });
  }
  const header = fill(t.amenitiesHeader, { hotel: config.branding.hotelName });
  const list = config.amenities.map(a =>
    `• ${a.name}${a.hours ? ` (${a.hours})` : ''}: ${a.description}`
  ).join("\n");
  return `${header}\n${list}\n${t.amenitiesFooter}`;
}

function buildPolicyResponse(message: string, config: HotelConfig, langCode: string): string {
  // Policies are returned in the language they were configured in
  const lower = message.toLowerCase();
  if (lower.includes("cancel") || lower.includes("cancelar") || lower.includes("annuler") || lower.includes("stornieren") || lower.includes("キャンセル") || lower.includes("取消") || lower.includes("रद्द")) {
    return config.policies.cancellationPolicy;
  }
  if (lower.includes("pet") || lower.includes("mascota") || lower.includes("animal") || lower.includes("haustier") || lower.includes("ペット") || lower.includes("宠物") || lower.includes("पालतू")) {
    return config.policies.petPolicy;
  }
  if (lower.includes("smok") || lower.includes("fumar") || lower.includes("rauchen") || lower.includes("喫煙") || lower.includes("吸烟") || lower.includes("धूम्रपान")) {
    return config.policies.smokingPolicy;
  }
  if (lower.includes("child") || lower.includes("niño") || lower.includes("enfant") || lower.includes("kinder") || lower.includes("子供") || lower.includes("儿童") || lower.includes("बच्चे")) {
    return config.policies.childPolicy;
  }
  if (lower.includes("extra bed") || lower.includes("cama extra") || lower.includes("lit supplémentaire") || lower.includes("zusatzbett")) {
    return config.policies.extraBedPolicy;
  }
  // Generic policy summary
  const t = getTemplatesForLanguage(langCode);
  return `${fill(t.checkIn, { hotel: config.branding.hotelName, time: config.policies.checkInTime })}\n${fill(t.checkOut, { hotel: config.branding.hotelName, time: config.policies.checkOutTime })}`;
}

function buildContactResponse(config: HotelConfig, langCode: string): string {
  const t = getTemplatesForLanguage(langCode);
  return fill(t.contactInfo, {
    hotel: config.branding.hotelName,
    address: config.contact.address,
    city: config.contact.city,
    country: config.contact.country,
    phone: config.contact.phone,
    email: config.contact.email,
  });
}

function buildComplaintResponse(config: HotelConfig, langCode: string): string {
  const t = getTemplatesForLanguage(langCode);
  return fill(t.complaint, { hotel: config.branding.hotelName, phone: config.contact.phone });
}

function buildHumanAgentResponse(config: HotelConfig, langCode: string): string {
  const t = getTemplatesForLanguage(langCode);
  return fill(t.humanAgent, { hotel: config.branding.hotelName, phone: config.contact.phone, email: config.contact.email });
}

function buildThanksResponse(config: HotelConfig, langCode: string): string {
  const t = getTemplatesForLanguage(langCode);
  return fill(t.thanks, { farewell: config.branding.farewellMessage });
}

function buildFarewellResponse(config: HotelConfig, langCode: string): string {
  const t = getTemplatesForLanguage(langCode);
  return fill(t.farewell, { hotel: config.branding.hotelName, farewell: config.branding.farewellMessage });
}

function buildUnknownResponse(config: HotelConfig, langCode: string): string {
  const t = getTemplatesForLanguage(langCode);
  return fill(t.unknown, { hotel: config.branding.hotelName });
}

// ============================================================
// MAIN RESPONSE GENERATOR
// ============================================================

export function generateResponse(message: string, config: HotelConfig, langCode?: string): string {
  const lang = langCode || config.language || "en-US";

  // 1. Check custom FAQ first
  const faqAnswer = checkCustomFAQ(message, config);
  if (faqAnswer) return faqAnswer;

  // 2. Detect intent using language-specific keywords
  const { intent } = detectIntent(message, lang);

  // 3. Route to handler
  switch (intent) {
    case "greeting":     return buildGreeting(config, lang);
    case "booking":      return buildBookingResponse(config, lang);
    case "room_info":    return buildRoomInfoResponse(config, lang);
    case "pricing":      return buildPricingResponse(config, lang);
    case "checkin":      return buildCheckInResponse(config, lang);
    case "checkout":     return buildCheckOutResponse(config, lang);
    case "dining":       return buildDiningResponse(config, lang);
    case "amenities":    return buildAmenitiesResponse(config, lang);
    case "policies":     return buildPolicyResponse(message, config, lang);
    case "contact":      return buildContactResponse(config, lang);
    case "shuttle":
    case "laundry": {
      const faq = checkCustomFAQ(message, config);
      if (faq) return faq;
      return buildHumanAgentResponse(config, lang);
    }
    case "complaint":    return buildComplaintResponse(config, lang);
    case "human_agent":  return buildHumanAgentResponse(config, lang);
    case "thanks":       return buildThanksResponse(config, lang);
    case "farewell":     return buildFarewellResponse(config, lang);
    default:             return buildUnknownResponse(config, lang);
  }
}
