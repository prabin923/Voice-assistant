// ============================================================
// UNIVERSAL RESPONSE ENGINE
// ============================================================
// Generates AI receptionist replies dynamically based on the
// current hotel configuration. No hardcoded hotel data.
// ============================================================

import { HotelConfig } from './hotelConfig';

// Intent detection: maps user input keywords → intent category
interface DetectedIntent {
  intent: string;
  confidence: number;
}

const INTENT_KEYWORDS: Record<string, string[]> = {
  greeting:       ["hello", "hi", "hey", "good morning", "good evening", "good afternoon", "greetings", "howdy"],
  booking:        ["book", "reserve", "reservation", "availability", "available", "stay", "night", "nights"],
  room_info:      ["room", "suite", "deluxe", "standard", "accommodation", "bed", "beds"],
  pricing:        ["price", "cost", "rate", "how much", "tariff", "charges", "fee", "expensive", "cheap", "affordable", "budget"],
  checkin:        ["check-in", "checkin", "check in", "arrive", "arrival", "early check"],
  checkout:       ["check-out", "checkout", "check out", "leave", "departure", "late check"],
  dining:         ["breakfast", "lunch", "dinner", "food", "restaurant", "dining", "menu", "eat", "meal", "café", "cafe", "bar"],
  amenities:      ["pool", "gym", "fitness", "spa", "wifi", "wi-fi", "internet", "parking", "amenities", "facilities", "business center"],
  policies:       ["policy", "cancel", "cancellation", "pet", "pets", "dog", "cat", "smoke", "smoking", "child", "children", "kid", "kids", "extra bed", "crib"],
  contact:        ["address", "location", "where", "phone", "call", "email", "contact", "reach", "directions"],
  shuttle:        ["shuttle", "airport", "transport", "transfer", "taxi", "cab", "pickup", "pick up", "drop"],
  laundry:        ["laundry", "dry clean", "iron", "ironing", "washing"],
  thanks:         ["thank", "thanks", "appreciate", "grateful"],
  complaint:      ["complaint", "complain", "issue", "problem", "not working", "broken", "dirty", "noisy", "noise", "cold", "hot"],
  human_agent:    ["human", "operator", "manager", "reception", "front desk", "real person", "agent", "speak to someone", "talk to someone"],
  farewell:       ["bye", "goodbye", "see you", "good night", "farewell"],
  faq:            [],  // Custom FAQ is matched separately
};

function detectIntent(message: string): DetectedIntent {
  const lower = message.toLowerCase();

  // Score each intent
  let bestIntent = "unknown";
  let bestScore = 0;

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (intent === "faq") continue;
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        score += kw.split(" ").length; // multi-word matches score higher
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
// RESPONSE BUILDERS — Each intent has its own handler
// ============================================================

function buildGreeting(config: HotelConfig): string {
  return `Hello! Welcome to ${config.branding.hotelName}. I'm your virtual receptionist. How may I assist you today?`;
}

function buildBookingResponse(config: HotelConfig): string {
  const cheapest = config.rooms.reduce((min, r) => r.pricePerNight < min.pricePerNight ? r : min, config.rooms[0]);
  return `I'd be happy to help you with a reservation at ${config.branding.hotelName}! We have ${config.rooms.length} room types available, starting from ${cheapest.currency} ${cheapest.pricePerNight} per night for our ${cheapest.name}. Could you please let me know your preferred check-in and check-out dates, and the number of guests?`;
}

function buildRoomInfoResponse(config: HotelConfig): string {
  const roomList = config.rooms.map(r =>
    `• ${r.name} — ${r.currency} ${r.pricePerNight}/night (up to ${r.maxOccupancy} guests): ${r.description}`
  ).join("\n");
  return `Here are our available room types at ${config.branding.hotelName}:\n${roomList}\nWould you like to book one of these, or do you need more details?`;
}

function buildPricingResponse(config: HotelConfig): string {
  const cheapest = config.rooms.reduce((min, r) => r.pricePerNight < min.pricePerNight ? r : min, config.rooms[0]);
  const mostExpensive = config.rooms.reduce((max, r) => r.pricePerNight > max.pricePerNight ? r : max, config.rooms[0]);
  return `Our room rates at ${config.branding.hotelName} range from ${cheapest.currency} ${cheapest.pricePerNight} per night for a ${cheapest.name} to ${mostExpensive.currency} ${mostExpensive.pricePerNight} per night for a ${mostExpensive.name}. Rates may vary depending on the season. Would you like me to check availability for specific dates?`;
}

function buildCheckInResponse(config: HotelConfig): string {
  return `Our standard check-in time at ${config.branding.hotelName} is at ${config.policies.checkInTime}. If you need an early check-in, please let us know and we'll do our best to accommodate you based on availability.`;
}

function buildCheckOutResponse(config: HotelConfig): string {
  return `Check-out time at ${config.branding.hotelName} is ${config.policies.checkOutTime}. If you need a late check-out, please contact us and we'll try to arrange it for you, subject to availability.`;
}

function buildDiningResponse(config: HotelConfig): string {
  if (config.dining.length === 0) {
    return `${config.branding.hotelName} offers dining options for our guests. Please contact the front desk for the latest dining information.`;
  }
  const venueList = config.dining.map(d =>
    `• ${d.name} (${d.cuisine}) — ${d.hours}: ${d.description}`
  ).join("\n");
  return `Here are the dining options at ${config.branding.hotelName}:\n${venueList}\nWould you like to make a reservation at any of these venues?`;
}

function buildAmenitiesResponse(config: HotelConfig): string {
  if (config.amenities.length === 0) {
    return `${config.branding.hotelName} offers a variety of amenities for our guests. Please ask the front desk for more details.`;
  }
  const amenityList = config.amenities.map(a =>
    `• ${a.name}${a.hours ? ` (${a.hours})` : ''}: ${a.description}`
  ).join("\n");
  return `Here are the amenities available at ${config.branding.hotelName}:\n${amenityList}\nIs there anything specific you'd like to know more about?`;
}

function buildPolicyResponse(message: string, config: HotelConfig): string {
  const lower = message.toLowerCase();
  if (lower.includes("cancel")) return `Cancellation Policy: ${config.policies.cancellationPolicy}`;
  if (lower.includes("pet") || lower.includes("dog") || lower.includes("cat")) return `Pet Policy: ${config.policies.petPolicy}`;
  if (lower.includes("smok")) return `Smoking Policy: ${config.policies.smokingPolicy}`;
  if (lower.includes("child") || lower.includes("kid") || lower.includes("crib")) return `Children Policy: ${config.policies.childPolicy}`;
  if (lower.includes("extra bed")) return `Extra Bed Policy: ${config.policies.extraBedPolicy}`;
  return `Here are some of our policies at ${config.branding.hotelName}:\n• Check-in: ${config.policies.checkInTime}\n• Check-out: ${config.policies.checkOutTime}\n• Cancellation: ${config.policies.cancellationPolicy}\n• Pets: ${config.policies.petPolicy}\n• Smoking: ${config.policies.smokingPolicy}`;
}

function buildContactResponse(config: HotelConfig): string {
  return `You can reach ${config.branding.hotelName} at:\n📍 ${config.contact.address}, ${config.contact.city}, ${config.contact.country}\n📞 ${config.contact.phone}\n✉️ ${config.contact.email}${config.contact.website ? `\n🌐 ${config.contact.website}` : ''}`;
}

function buildComplaintResponse(config: HotelConfig): string {
  return `I'm very sorry to hear you're experiencing an issue. Your comfort is our top priority at ${config.branding.hotelName}. Let me connect you with our front desk team right away so they can resolve this for you. You can also reach them directly at ${config.contact.phone}.`;
}

function buildHumanAgentResponse(config: HotelConfig): string {
  return `Absolutely. Let me transfer you to our front desk team at ${config.branding.hotelName}. You can also reach them directly at ${config.contact.phone} or via email at ${config.contact.email}. Please hold for a moment.`;
}

function buildThanksResponse(config: HotelConfig): string {
  return `You're very welcome! If there's anything else you need during your stay at ${config.branding.hotelName}, please don't hesitate to ask. ${config.branding.farewellMessage}`;
}

function buildFarewellResponse(config: HotelConfig): string {
  return `${config.branding.farewellMessage} We look forward to welcoming you at ${config.branding.hotelName}. Goodbye!`;
}

function buildUnknownResponse(config: HotelConfig): string {
  return `I apologize, I wasn't able to fully understand your query. As the virtual receptionist for ${config.branding.hotelName}, I can help you with room bookings, hotel amenities, dining, policies, and more. Could you please rephrase your question, or would you like me to connect you with a staff member?`;
}

// ============================================================
// MAIN RESPONSE GENERATOR
// ============================================================

export function generateResponse(message: string, config: HotelConfig): string {
  // 1. Check custom FAQ first
  const faqAnswer = checkCustomFAQ(message, config);
  if (faqAnswer) return faqAnswer;

  // 2. Detect intent
  const { intent } = detectIntent(message);

  // 3. Route to handler
  switch (intent) {
    case "greeting":     return buildGreeting(config);
    case "booking":      return buildBookingResponse(config);
    case "room_info":    return buildRoomInfoResponse(config);
    case "pricing":      return buildPricingResponse(config);
    case "checkin":      return buildCheckInResponse(config);
    case "checkout":     return buildCheckOutResponse(config);
    case "dining":       return buildDiningResponse(config);
    case "amenities":    return buildAmenitiesResponse(config);
    case "policies":     return buildPolicyResponse(message, config);
    case "contact":      return buildContactResponse(config);
    case "shuttle":
    case "laundry": {
      const faq = checkCustomFAQ(message, config);
      return faq ?? `Let me check on that for you. Please hold while I connect you with our team at ${config.branding.hotelName}. You can also call us at ${config.contact.phone}.`;
    }
    case "complaint":    return buildComplaintResponse(config);
    case "human_agent":  return buildHumanAgentResponse(config);
    case "thanks":       return buildThanksResponse(config);
    case "farewell":     return buildFarewellResponse(config);
    default:             return buildUnknownResponse(config);
  }
}
