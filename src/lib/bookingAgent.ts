/**
 * Booking Agent — an LLM receptionist that drives room/dining bookings via
 * function calling instead of hardcoded template replies.
 *
 * Safety boundary: the LLM writes all the conversation (natural, persuasive,
 * multilingual) but EVERY ground-truth operation goes through a tool that wraps
 * the existing deterministic services:
 *   - check_room_availability / find_next_availability -> real inventory
 *   - book_room / book_dining_table -> transactional writes (re-check inside)
 *   - search_hotel_info -> RAG over settings + crawled website
 * The model can never invent availability or "confirm" a booking that didn't
 * actually persist — it only states what a tool returned.
 */

import {
  GoogleGenerativeAI,
  SchemaType,
  type Content,
  type FunctionDeclaration,
} from "@google/generative-ai";
import { getGeminiApiKey } from "@/lib/gemini";
import { GEMINI_MODEL } from "@/lib/geminiModel";
import type { HotelConfig } from "@/lib/hotelConfig";
import type { ChatHistoryMessage } from "@/lib/dateParsing";
import { todayIsoDate } from "@/lib/dateParsing";
import { getLanguageByCode, resolveSupportedLanguageCode } from "@/lib/languages";
import { buildHotelDataBlock } from "@/lib/rag/augmentMessage";
import { retrieveRelevantChunks } from "@/lib/rag/knowledgeIndex";
import {
  getAvailabilitySnapshot,
  findNextAvailableWindows,
} from "@/lib/availabilityQuery";
import { createBookingSafe, publicBookingRow } from "@/lib/bookingService";
import type { BookingSummary, PendingBooking } from "@/lib/bookingFlow";
import prisma from "@/lib/prisma";
import { loyaltySystemPromptFragment } from "@/lib/loyalty";
import { guestPreferencesPromptFragment } from "@/lib/guestPreferences";
import { isPaymentEnabled, calculateDeposit, createDepositCheckoutSession } from "@/lib/stripePayment";
import { getTenantStore } from "@/lib/tenantContext";

/**
 * Opaque marker stored in the `pendingBooking` round-trip while the agent is
 * mid-conversation, so the next turn re-engages the agent even when the guest's
 * reply has no booking keyword (e.g. just a name/phone in Nepali). The client
 * round-trips this transparently; the agent ignores its contents (it tracks
 * state from the conversation history).
 */
export const AGENT_PENDING_BOOKING: PendingBooking = {
  roomType: "",
  checkIn: "",
  checkOut: "",
  rooms: 1,
  guestName: "",
  guestPhone: "",
};

import {
  createDiningReservationSafe,
  toDiningSummary,
  type DiningReservationSummary,
} from "@/lib/diningReservationService";

import {
  createSpaReservationSafe,
  toSpaSummary,
  type SpaReservationSummary,
} from "@/lib/spaReservationService";

import {
  createServiceRequestSafe,
} from "@/lib/serviceRequestService";

export type GuestProfileLite = { id: string; name: string; phone: string | null; email: string };

export type BookingAgentResult = {
  reply: string;
  booking?: BookingSummary;
  dining?: DiningReservationSummary;
  spa?: SpaReservationSummary;
  serviceRequest?: { id: string; type: string; description: string; status: string };
  escalate: boolean;
  active: boolean; // keep routing follow-up turns to the agent
};

let genAi: GoogleGenerativeAI | null = null;
function gemini() {
  if (!genAi) genAi = new GoogleGenerativeAI(getGeminiApiKey() || "");
  return genAi;
}

export const TOOLS: FunctionDeclaration[] = [
  {
    name: "search_hotel_info",
    description:
      "Look up hotel facts from settings and the hotel website (amenities, policies, dining, directions, FAQs). Use this to answer questions and to find selling points when persuading a guest.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: { query: { type: SchemaType.STRING, description: "What to look up" } },
      required: ["query"],
    },
  },
  {
    name: "check_room_availability",
    description:
      "Check LIVE room availability and prices for specific dates. ALWAYS call this before stating availability, counts, or prices for a stay. Dates must be YYYY-MM-DD.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        checkIn: { type: SchemaType.STRING, description: "Check-in date YYYY-MM-DD" },
        checkOut: { type: SchemaType.STRING, description: "Check-out date YYYY-MM-DD" },
        roomType: { type: SchemaType.STRING, description: "Optional exact room name to filter to" },
      },
      required: ["checkIn", "checkOut"],
    },
  },
  {
    name: "find_next_availability",
    description:
      "Find the next dates a room type is free for a number of nights, when the guest's requested dates are full or they're flexible.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        roomType: { type: SchemaType.STRING, description: "Exact room name" },
        nights: { type: SchemaType.NUMBER, description: "Number of nights" },
      },
      required: ["roomType", "nights"],
    },
  },
  {
    name: "book_room",
    description:
      "Create a CONFIRMED room booking. Only call once you have room type, dates, and the guest's name and phone. Returns the booking id on success, or an error if unavailable. Never tell the guest a booking is confirmed unless this returns ok:true.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        roomType: { type: SchemaType.STRING },
        checkIn: { type: SchemaType.STRING, description: "YYYY-MM-DD" },
        checkOut: { type: SchemaType.STRING, description: "YYYY-MM-DD" },
        rooms: { type: SchemaType.NUMBER, description: "Number of rooms (default 1)" },
        guestName: { type: SchemaType.STRING },
        guestPhone: { type: SchemaType.STRING },
        guestEmail: { type: SchemaType.STRING },
        specialRequests: { type: SchemaType.STRING },
      },
      required: ["roomType", "checkIn", "checkOut", "guestName", "guestPhone"],
    },
  },
  {
    name: "book_dining_table",
    description:
      "Create a CONFIRMED dining reservation. Only call with venue, date, time, party size, guest name and phone. Returns id on success.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        venueName: { type: SchemaType.STRING },
        reservationDate: { type: SchemaType.STRING, description: "YYYY-MM-DD" },
        reservationTime: { type: SchemaType.STRING, description: "e.g. 19:30" },
        partySize: { type: SchemaType.NUMBER },
        guestName: { type: SchemaType.STRING },
        guestPhone: { type: SchemaType.STRING },
        guestEmail: { type: SchemaType.STRING },
        specialRequests: { type: SchemaType.STRING },
      },
      required: ["venueName", "reservationDate", "reservationTime", "partySize", "guestName", "guestPhone"],
    },
  },
  {
    name: "book_spa_treatment",
    description:
      "Create a CONFIRMED spa reservation. Only call with spa service name, date, time, guest name and phone. Returns reservation details on success.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        serviceName: { type: SchemaType.STRING },
        reservationDate: { type: SchemaType.STRING, description: "YYYY-MM-DD" },
        reservationTime: { type: SchemaType.STRING, description: "e.g. 11:30" },
        durationMinutes: { type: SchemaType.NUMBER, description: "Optional duration (minutes)" },
        guestName: { type: SchemaType.STRING },
        guestPhone: { type: SchemaType.STRING },
        guestEmail: { type: SchemaType.STRING },
        specialRequests: { type: SchemaType.STRING },
        price: { type: SchemaType.NUMBER },
        currency: { type: SchemaType.STRING },
      },
      required: ["serviceName", "reservationDate", "reservationTime", "guestName", "guestPhone"],
    },
  },
  {
    name: "create_service_request",
    description:
      "Submit a service request for room cleanup, maintenance (fixing broken AC/leak/etc), or room service. Only call once you have request type, description, and guest name.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        type: { type: SchemaType.STRING, description: "housekeeping, maintenance, or roomservice" },
        description: { type: SchemaType.STRING, description: "Detailed request description e.g. 'AC not blowing cold air'" },
        roomNumber: { type: SchemaType.STRING, description: "Optional room number" },
        guestName: { type: SchemaType.STRING },
        priority: { type: SchemaType.STRING, description: "Optional: low, medium, high, urgent" },
      },
      required: ["type", "description", "guestName"],
    },
  },
];

type ToolCtx = {
  config: HotelConfig;
  langCode: string;
  guestProfile?: GuestProfileLite;
  out: {
    booking?: BookingSummary;
    dining?: DiningReservationSummary;
    spa?: SpaReservationSummary;
    serviceRequest?: { id: string; type: string; description: string; status: string };
  };
};

async function execTool(name: string, args: Record<string, unknown>, ctx: ToolCtx): Promise<object> {
  const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const n = (v: unknown) => (typeof v === "number" ? v : Number(v));
  try {
    switch (name) {
      case "search_hotel_info": {
        const chunks = await retrieveRelevantChunks(s(args.query), {
          topK: 5,
          minScore: 0.2,
          languageCode: ctx.langCode,
        });
        return { results: chunks.map((c) => ({ title: c.title, content: c.content })) };
      }
      case "check_room_availability": {
        const checkIn = s(args.checkIn), checkOut = s(args.checkOut);
        if (!checkIn || !checkOut) return { error: "checkIn and checkOut (YYYY-MM-DD) are required." };
        const snap = await getAvailabilitySnapshot(ctx.config, checkIn, checkOut);
        const filterRoom = s(args.roomType).toLowerCase();
        const rooms = snap
          .filter((r) => !filterRoom || r.roomType.toLowerCase() === filterRoom)
          .map((r) => ({
            roomType: r.roomType,
            available: r.available,
            pricePerNight: r.pricePerNight,
            currency: r.currency,
            maxOccupancy: r.maxOccupancy,
          }));
        return { checkIn, checkOut, rooms };
      }
      case "find_next_availability": {
        const windows = await findNextAvailableWindows(ctx.config, s(args.roomType), Math.max(1, n(args.nights) || 1), { maxResults: 3 });
        return { roomType: s(args.roomType), windows };
      }
      case "book_room": {
        const pending: PendingBooking = {
          roomType: s(args.roomType),
          checkIn: s(args.checkIn),
          checkOut: s(args.checkOut),
          rooms: args.rooms != null ? Math.max(1, n(args.rooms)) : 1,
          guestName: s(args.guestName) || ctx.guestProfile?.name || "",
          guestPhone: s(args.guestPhone) || ctx.guestProfile?.phone || "",
          guestEmail: s(args.guestEmail) || ctx.guestProfile?.email || null,
          specialRequests: s(args.specialRequests) || null,
        };

        if (isPaymentEnabled(ctx.config)) {
          try {
            const store = getTenantStore();
            const hotelId = store?.hotelId ?? "default";
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
            const { amount, currency } = calculateDeposit(pending, ctx.config);
            const session = await createDepositCheckoutSession(pending, ctx.config, hotelId, appUrl);

            return {
              ok: true,
              requiresPayment: true,
              checkoutUrl: session.url,
              depositAmount: amount / 100,
              currency: currency.toUpperCase(),
            };
          } catch (err) {
            console.error("Failed to generate payment session in booking agent tool:", err);
          }
        }

        const res = await createBookingSafe({
          ...pending,
          guestId: ctx.guestProfile?.id ?? null,
        });
        if (res.ok) {
          ctx.out.booking = publicBookingRow(res.booking);
          return { ok: true, bookingId: res.booking.id, booking: ctx.out.booking };
        }
        return { ok: false, error: res.error, available: res.available };
      }
      case "book_dining_table": {
        const res = await createDiningReservationSafe({
          venueName: s(args.venueName),
          reservationDate: s(args.reservationDate),
          reservationTime: s(args.reservationTime),
          partySize: Math.max(1, n(args.partySize) || 1),
          guestName: s(args.guestName) || ctx.guestProfile?.name || "",
          guestPhone: s(args.guestPhone) || ctx.guestProfile?.phone || "",
          guestEmail: s(args.guestEmail) || ctx.guestProfile?.email || null,
          guestId: ctx.guestProfile?.id ?? null,
          specialRequests: s(args.specialRequests) || null,
        });
        if (res.ok) {
          ctx.out.dining = toDiningSummary(res.reservation);
          return { ok: true, reservationId: res.reservation.id, reservation: ctx.out.dining };
        }
        return { ok: false, error: res.error };
      }
      case "book_spa_treatment": {
        const res = await createSpaReservationSafe({
          serviceName: s(args.serviceName),
          reservationDate: s(args.reservationDate),
          reservationTime: s(args.reservationTime),
          durationMinutes: args.durationMinutes != null ? n(args.durationMinutes) : undefined,
          guestName: s(args.guestName) || ctx.guestProfile?.name || "",
          guestPhone: s(args.guestPhone) || ctx.guestProfile?.phone || "",
          guestEmail: s(args.guestEmail) || ctx.guestProfile?.email || null,
          guestId: ctx.guestProfile?.id ?? null,
          specialRequests: s(args.specialRequests) || null,
          price: args.price != null ? n(args.price) : undefined,
          currency: s(args.currency) || undefined,
        });
        if (res.ok) {
          ctx.out.spa = toSpaSummary(res.reservation);
          return { ok: true, reservationId: res.reservation.id, reservation: ctx.out.spa };
        }
        return { ok: false, error: res.error };
      }
      case "create_service_request": {
        const res = await createServiceRequestSafe({
          type: s(args.type),
          description: s(args.description),
          roomNumber: s(args.roomNumber) || undefined,
          guestName: s(args.guestName) || ctx.guestProfile?.name || "",
          guestId: ctx.guestProfile?.id ?? undefined,
          priority: s(args.priority) || undefined,
        });
        if (res.ok) {
          ctx.out.serviceRequest = {
            id: res.request.id,
            type: res.request.type,
            description: res.request.description,
            status: res.request.status,
          };
          return { ok: true, requestId: res.request.id, request: ctx.out.serviceRequest };
        }
        return { ok: false, error: res.error };
      }
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "tool failed" };
  }
}

function buildSystemPrompt(
  config: HotelConfig,
  langCode: string,
  channel: "voice" | "text",
  guestProfile?: GuestProfileLite,
  profileContext?: string
): string {
  const widgetLang = getLanguageByCode(langCode)?.name || "English";
  const langLine =
    `\nLANGUAGE: Reply in the SAME language the guest is actually writing in — this INCLUDES romanized/transliterated languages. ` +
    `If a guest uses Latin transliteration for any supported language, understand it and reply in that language's customary script unless asked otherwise, ` +
    `keeping room names and other proper nouns as-is. Do not switch to English just because the guest mixed in English words. ` +
    `Only if the guest's language is genuinely unclear, default to ${widgetLang}.`;
  const guestLine = guestProfile
    ? `\nThe guest is signed in as ${guestProfile.name}${guestProfile.phone ? ` (phone ${guestProfile.phone})` : ""}. Use these details for bookings instead of re-asking.${profileContext || ""}`
    : "\nThe guest is not signed in — collect their name and phone before booking.";
  const voiceLine = channel === "voice"
    ? "\nThis is a VOICE call: reply in 1-2 short, warm spoken sentences. No lists or markup."
    : "";

  return `You are the friendly, professional front-desk receptionist at ${config.branding.hotelName}. You speak like a real, warm human receptionist — never robotic, never a brochure.

Today's date is ${todayIsoDate()}. Resolve relative dates ("tonight", "this weekend", "next Friday") to exact YYYY-MM-DD before using tools.

YOUR GOAL: genuinely help the guest AND gently guide them toward booking, the way a great receptionist does — recommend the room that fits their needs, highlight real value (views, amenities, dining, location), suggest a sensible upgrade when it makes sense, reassure on hesitation, and make booking feel easy. Be persuasive but honest and never pushy.

GROUNDING RULES (critical):
- Use tools for all facts. NEVER state availability, room counts, or prices without first calling check_room_availability. NEVER say a booking or table is confirmed unless book_room / book_dining_table / book_spa_treatment / create_service_request returned ok:true — read back the real confirmation id.
- If a tool reports limited availability ("1 left"), you may use honest urgency. Never invent scarcity.
- For amenities, policies, directions, dining details, spa details, or anything you're unsure of, call search_hotel_info. If it isn't in the results, say you'll check with the front desk — do not make it up.
- Collect missing booking details naturally in conversation; don't dump a form.
- NEVER re-ask for something the guest already told you earlier in this conversation. Before asking, re-read the history and reuse any room type, dates, name, or phone already given. Only ask for what is still genuinely missing.
- When the guest asks what rooms/options are available WITHOUT giving dates, first briefly name the room types we offer (from HOTEL REFERENCE) with their nightly price, THEN ask for their check-in/check-out dates to confirm live availability. Never reply with only "what dates?" — always give them something useful first.
- After a successful booking, confirm the key details warmly and offer one relevant add-on (e.g. dining, spa, airport pickup) without pressure.${guestLine}${langLine}${voiceLine}

HOTEL REFERENCE (static; still verify live availability with tools):
${buildHotelDataBlock(config, false)}`;
}

function toGeminiHistory(history: ChatHistoryMessage[]): Content[] {
  return history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-20)
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
}

export async function runBookingAgent(params: {
  message: string;
  langCode: string;
  config: HotelConfig;
  history: ChatHistoryMessage[];
  channel: "voice" | "text";
  guestProfile?: GuestProfileLite;
}): Promise<BookingAgentResult> {
  const { message, config, history, channel, guestProfile } = params;
  const langCode = resolveSupportedLanguageCode(params.langCode) ?? "en-US";

  let profileContext = "";
  if (guestProfile) {
    try {
      const [prefsFragment, guestRecord] = await Promise.all([
        guestPreferencesPromptFragment(guestProfile.id),
        prisma.guest.findUnique({ where: { id: guestProfile.id }, select: { bookingCount: true } })
      ]);
      const bookingCount = guestRecord?.bookingCount ?? 0;
      const loyaltyFragment = loyaltySystemPromptFragment(bookingCount, guestProfile.name);
      profileContext = `\n${loyaltyFragment}\n${prefsFragment}`;
    } catch (e) {
      console.warn("Failed to load guest preferences/loyalty context for LLM receptionist:", e);
    }
  }

  const model = gemini().getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: buildSystemPrompt(config, langCode, channel, guestProfile, profileContext),
    tools: [{ functionDeclarations: TOOLS }],
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: channel === "voice" ? 200 : 700,
    },
  });

  const chat = model.startChat({ history: toGeminiHistory(history) });
  const ctx: ToolCtx = { config, langCode, guestProfile, out: {} };

  let result = await chat.sendMessage(message);
  let toolCalled = false;

  for (let i = 0; i < 6; i++) {
    const calls = result.response.functionCalls() ?? [];
    if (!calls.length) break;
    toolCalled = true;
    const responses = [];
    for (const call of calls) {
      const output = await execTool(call.name, (call.args ?? {}) as Record<string, unknown>, ctx);
      responses.push({ functionResponse: { name: call.name, response: output } });
    }
    result = await chat.sendMessage(responses);
  }

  const reply = (result.response.text() || "").trim();
  const confirmed = Boolean(ctx.out.booking || ctx.out.dining || ctx.out.spa || ctx.out.serviceRequest);
  // Stay engaged while gathering info / presenting options; release once a
  // booking is confirmed, or when the agent gave a plain answer with no tools.
  const active = !confirmed && (toolCalled || /[?？]\s*$/.test(reply));

  return {
    reply: reply || "How can I help you with your stay?",
    booking: ctx.out.booking,
    dining: ctx.out.dining,
    spa: ctx.out.spa,
    serviceRequest: ctx.out.serviceRequest,
    escalate: false,
    active,
  };
}
