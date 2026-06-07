import { GoogleGenerativeAI, Content, GenerativeModel } from "@google/generative-ai";
import OpenAI from "openai";
import { getActiveAiProvider } from "@/lib/ai";
import { getGeminiApiKey } from "@/lib/gemini";
import { GEMINI_MODEL } from "@/lib/geminiModel";
import { getOpenAiApiKey } from "@/lib/openai";
import { resolveEscalation, type EscalationReason } from "@/lib/escalation";
import { getHotelConfig, type HotelConfig } from "./hotelConfig";

let genAiSingleton: GoogleGenerativeAI | null = null;
let openAiSingleton: OpenAI | null = null;
const geminiModelCache = new Map<string, GenerativeModel>();

let instructionCache: {
  config: HotelConfig;
  voice: string;
  text: string;
} | null = null;

function getGenAI() {
  if (!genAiSingleton) {
    genAiSingleton = new GoogleGenerativeAI(getGeminiApiKey() || "");
  }
  return genAiSingleton;
}

function getOpenAI() {
  if (!openAiSingleton) {
    openAiSingleton = new OpenAI({ apiKey: getOpenAiApiKey() });
  }
  return openAiSingleton;
}

function historyLimit(channel: "voice" | "text"): number {
  return channel === "voice" ? 6 : 8;
}

function getGeminiModel(channel: "voice" | "text"): GenerativeModel {
  const cacheKey = `${GEMINI_MODEL}:${channel}`;
  const cached = geminiModelCache.get(cacheKey);
  if (cached) return cached;

  const model = getGenAI().getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: getCachedSystemInstruction(channel),
    generationConfig: {
      maxOutputTokens: channel === "voice" ? 140 : 320,
      temperature: channel === "voice" ? 0.6 : 0.45,
    },
  });
  geminiModelCache.set(cacheKey, model);
  return model;
}

/** Invalidate cached prompts/models after hotel config changes in settings. */
export function invalidateResponseEngineCache(): void {
  instructionCache = null;
  geminiModelCache.clear();
}

function buildHotelDataBlock(config: HotelConfig, compact: boolean): string {
  if (compact) {
    return `- ${config.branding.hotelName}, ${config.contact.city}
- Check-in ${config.policies.checkInTime}, check-out ${config.policies.checkOutTime}
- Rooms: ${config.rooms.map((r) => `${r.name} ${r.currency}${r.pricePerNight}/night`).join("; ")}
- Amenities: ${config.amenities.map((a) => a.name).join(", ")}
- Dining: ${config.dining.map((d) => d.name).join(", ") || "see FAQ"}`;
  }

  const diningBlock =
    config.dining?.length > 0
      ? config.dining.map((d) => `${d.name} (${d.cuisine}): ${d.hours}`).join("; ")
      : "None configured.";
  const faqBlock =
    config.customFAQ?.length > 0
      ? config.customFAQ.map((f) => `${f.question} → ${f.answer}`).join("; ")
      : "None configured.";

  return `- Hotel: ${config.branding.hotelName}, ${config.contact.address}, ${config.contact.city}
- Phone: ${config.contact.phone}, Email: ${config.contact.email}
- Check-in/out: ${config.policies.checkInTime} / ${config.policies.checkOutTime}
- Cancellation: ${config.policies.cancellationPolicy}
- Pets: ${config.policies.petPolicy}
- Smoking: ${config.policies.smokingPolicy}
- Children: ${config.policies.childPolicy}
- Amenities: ${config.amenities.map((a) => `${a.name}${a.hours ? ` (${a.hours})` : ""}`).join("; ")}
- Dining: ${diningBlock}
- FAQ: ${faqBlock}
- Rooms: ${config.rooms
    .map(
      (r) =>
        `${r.name}: ${r.currency}${r.pricePerNight}/night, max ${r.maxOccupancy} — ${r.description}`,
    )
    .join("; ")}`;
}

function buildSystemInstructionRaw(channel: "voice" | "text" = "text"): string {
  const config = getHotelConfig();
  const compact = channel === "voice";
  const hotelData = buildHotelDataBlock(config, compact);

  const voiceRules = compact
    ? `VOICE STYLE: Warm concierge on a phone call. 1–2 short sentences. No lists, markdown, or IMAGE lines.`
    : "";

  const escalationRules = compact
    ? `[ESCALATE] only for: human request, emergency, billing dispute, serious complaint. NOT for FAQ, amenities, or booking help.`
    : `WHEN TO [ESCALATE]: human request, emergency, billing/refund dispute, serious complaint, policy exception.
DO NOT [ESCALATE]: FAQ, amenities, dining, policies, booking/availability help.`;

  return `You are the AI concierge at ${config.branding.hotelName}.
${config.receptionistPersona}
${voiceRules}
Answer ONLY what the guest asked. Use conversation context when relevant.

HOTEL DATA:
${hotelData}

${escalationRules}
For availability with specific dates, ask for check-in/check-out — live inventory is checked automatically when booking.
${compact ? "" : 'Room images: optional line "IMAGE: <url>" using URLs from HOTEL DATA only.'}`;
}

function getCachedSystemInstruction(channel: "voice" | "text"): string {
  const config = getHotelConfig();
  if (instructionCache?.config === config) {
    return channel === "voice" ? instructionCache.voice : instructionCache.text;
  }
  instructionCache = {
    config,
    voice: buildSystemInstructionRaw("voice"),
    text: buildSystemInstructionRaw("text"),
  };
  geminiModelCache.clear();
  return channel === "voice" ? instructionCache.voice : instructionCache.text;
}

export function buildSystemInstruction(channel: "voice" | "text" = "text"): string {
  return getCachedSystemInstruction(channel);
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

async function getAssistantResponseWithOpenAI(
  message: string,
  langCode: string,
  conversationHistory: ChatMessage[],
  channel: "voice" | "text" = "text"
): Promise<{ reply: string; escalate: boolean; reason?: EscalationReason }> {
  const limit = historyLimit(channel);
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: getCachedSystemInstruction(channel) },
    ...conversationHistory.slice(-limit).map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    })),
    { role: "user", content: message },
  ];

  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    max_tokens: channel === "voice" ? 140 : 320,
    temperature: channel === "voice" ? 0.6 : 0.45,
  });

  const text = completion.choices[0]?.message?.content?.trim() ?? "";
  const { reply, escalate, reason } = resolveEscalation(text);
  return { reply, escalate, reason: escalate ? reason : undefined };
}

async function getAssistantResponseWithGemini(
  message: string,
  langCode: string,
  conversationHistory: ChatMessage[],
  channel: "voice" | "text" = "text"
): Promise<{ reply: string; escalate: boolean; reason?: EscalationReason }> {
  const limit = historyLimit(channel);
  const history: Content[] = conversationHistory.slice(-limit).map((msg) => ({
    role: msg.role === "user" ? "user" : "model",
    parts: [{ text: msg.content }],
  }));

  const model = getGeminiModel(channel);
  const result = await model.generateContent({
    contents: [
      ...history,
      { role: "user", parts: [{ text: message }] },
    ],
  });
  const text = result.response.text().trim();
  const { reply, escalate, reason } = resolveEscalation(text);
  return { reply, escalate, reason: escalate ? reason : undefined };
}

export async function getAssistantResponse(
  message: string,
  language: string,
  conversationHistory: ChatMessage[] = [],
  channel: "voice" | "text" = "text"
): Promise<{ reply: string; escalate: boolean; reason?: EscalationReason }> {
  const config = getHotelConfig();
  const langCode = language || config.language || "en-US";
  const provider = getActiveAiProvider();

  const MAX_RETRIES = 1;
  const RETRY_DELAY_MS = 350;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (provider === "openai") {
        return await getAssistantResponseWithOpenAI(message, langCode, conversationHistory, channel);
      }

      return await getAssistantResponseWithGemini(message, langCode, conversationHistory, channel);
    } catch (error: any) {
      const isRetryable =
        !error?.status || error.status >= 500 || error.message?.includes("fetch");

      if (attempt < MAX_RETRIES && isRetryable) {
        console.warn(`[Response Engine] Attempt ${attempt + 1} failed, retrying...`, error.message);
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }

      console.error("Response Engine Error:", error);
      return {
        reply:
          "I apologize — I'm having trouble understanding your request right now. I've alerted our front desk team and a staff member will take over shortly.",
        escalate: true,
        reason: "ai_error",
      };
    }
  }

  // Fallback (unreachable in practice)
  return { reply: "Something went wrong. Please try again.", escalate: false };
}
