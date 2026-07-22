import { GoogleGenerativeAI, Content, GenerativeModel } from "@google/generative-ai";
import OpenAI from "openai";
import { getActiveAiProvider } from "@/lib/ai";
import { getGeminiApiKey } from "@/lib/gemini";
import { GEMINI_MODEL } from "@/lib/geminiModel";
import { getOpenAiApiKey } from "@/lib/openai";
import { resolveEscalation, type EscalationReason } from "@/lib/escalation";
import { augmentUserMessageWithHotelContext } from "@/lib/rag/augmentMessage";
import { buildHotelDataBlock } from "@/lib/rag/augmentMessage";
import { resolveSupportedLanguageCode } from "@/lib/languages";
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
  return channel === "voice" ? 6 : 12;
}

function getGeminiModel(channel: "voice" | "text"): GenerativeModel {
  const cacheKey = `${GEMINI_MODEL}:${channel}`;
  const cached = geminiModelCache.get(cacheKey);
  if (cached) return cached;

  const model = getGenAI().getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: getCachedSystemInstruction(channel),
    generationConfig: {
      maxOutputTokens: channel === "voice" ? 90 : 450,
      temperature: channel === "voice" ? 0.3 : 0.4,
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

// Invalidate on module load so stale models from previous deploys don't persist
geminiModelCache.clear();

function buildSystemInstructionRaw(channel: "voice" | "text" = "text", fullHotelData = false): string {
  const config = getHotelConfig();
  const compact = channel === "voice";

  const voiceRules = compact
    ? `VOICE STYLE (live phone call):
- 1–2 short sentences only. Warm, calm concierge — never robotic.
- Brief acknowledgment when natural ("Sure," "Of course," "Happy to help").
- One idea per turn. No lists, markdown, bullet points, or IMAGE lines.
- Use contractions (we're, you'll, it's). Avoid "According to our policy" or brochure language.
- Optional gentle follow-up only when useful ("Would you like me to book that?").`
    : "";

  const escalationRules = compact
    ? `[ESCALATE] only for: guest explicitly asks for a human, emergency, billing dispute, serious complaint. NEVER for FAQ, rooms, dining, policies, or reservations.`
    : `WHEN TO [ESCALATE]: guest explicitly requests a human, emergency, billing/refund dispute, serious complaint.
NEVER [ESCALATE]: FAQ, amenities, dining hours, policies, room availability, room bookings, or restaurant table reservations — you handle these autonomously.`;

  const autonomousRules = `AUTONOMOUS CONCIERGE — no staff needed for:
- Any hotel information (policies, amenities, dining, rooms, FAQ, directions, parking, contact)
- Room availability, booking, modification, cancellation (handled by the system when guests provide dates/details)
- Restaurant table reservations at hotel venues (handled by the system)
Answer confidently from HOTEL FACTS. Never say you cannot book rooms or tables.`;

  const groundingRules = `GROUNDING RULES — strictly enforced:
- Answer ONLY from the HOTEL FACTS provided in each message. Never invent facts.
- If the answer is not in HOTEL FACTS, say: "I don't have that detail — our front desk can help at ${getHotelConfig().contact.phone}."
- NEVER make up room features, prices, policies, availability, or amenities not explicitly listed.
- NEVER confirm an action the system has not yet completed ("I've booked your room" must only follow a confirmed booking).`;

  const varietyRules = `CONVERSATION VARIETY — always apply:
- Vary your opening words every turn. Never start two consecutive replies identically.
- Do not re-explain something already covered earlier in this conversation.
- Do not repeat the same offer (e.g. "Would you like me to book?") more than once unless the guest changes topic.
- Use different sentence structures: statements, questions, and suggestions — not just answers.`;

  const hotelFactsRule = fullHotelData
    ? ""
    : `Each guest message includes HOTEL FACTS (and DIALOGUE EXAMPLES when retrieved) for that specific question. Use only those facts. Mirror the dialogue tone — concise, warm, conversational. If the guest asks something not covered by the HOTEL FACTS, politely say you don't have that detail and offer the front desk number.`;

  const hotelDataBlock = fullHotelData
    ? `\nHOTEL DATA:\n${buildHotelDataBlock(config, compact)}\n`
    : "";

  return `You are the AI concierge at ${config.branding.hotelName}.
${config.receptionistPersona}
${voiceRules}
Answer ONLY what the guest asked. Use conversation context when relevant.
${autonomousRules}
${groundingRules}
${varietyRules}
${hotelFactsRule}${hotelDataBlock}
${escalationRules}
For room availability with dates, ask for check-in/check-out — inventory is checked automatically.
For dining reservations, guests can say "book a table" — the system completes it when venue, date, time, and contact are provided.
${compact ? "" : 'Room images: optional line "IMAGE: <url>" using URLs from hotel facts only.'}`;
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

/** System prompt for the LLM. Use fullHotelData for Gemini Live (no per-turn RAG). */
export function buildSystemInstruction(
  channel: "voice" | "text" = "text",
  options?: { fullHotelData?: boolean }
): string {
  if (options?.fullHotelData) {
    return buildSystemInstructionRaw(channel, true);
  }
  return getCachedSystemInstruction(channel);
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

async function prepareUserMessage(
  message: string,
  conversationHistory: ChatMessage[],
  channel: "voice" | "text",
  langCode?: string
): Promise<string> {
  const config = getHotelConfig();
  const { message: augmented } = await augmentUserMessageWithHotelContext(
    message,
    conversationHistory,
    config,
    channel,
    langCode
  );
  return augmented;
}

async function getAssistantResponseWithOpenAI(
  message: string,
  langCode: string,
  conversationHistory: ChatMessage[],
  channel: "voice" | "text" = "text"
): Promise<{ reply: string; escalate: boolean; reason?: EscalationReason }> {
  const limit = historyLimit(channel);
  const userContent = await prepareUserMessage(message, conversationHistory, channel, langCode);
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: getCachedSystemInstruction(channel) },
    ...conversationHistory.slice(-limit).map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    })),
    { role: "user", content: userContent },
  ];

  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    max_tokens: channel === "voice" ? 90 : 450,
    temperature: channel === "voice" ? 0.3 : 0.4,
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
  const userContent = await prepareUserMessage(message, conversationHistory, channel, langCode);
  const history: Content[] = conversationHistory.slice(-limit).map((msg) => ({
    role: msg.role === "user" ? "user" : "model",
    parts: [{ text: msg.content }],
  }));

  const model = getGeminiModel(channel);
  const result = await model.generateContent({
    contents: [...history, { role: "user", parts: [{ text: userContent }] }],
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
  const langCode =
    resolveSupportedLanguageCode(language) ??
    resolveSupportedLanguageCode(config.language) ??
    "en-US";
  const provider = getActiveAiProvider();

  // Voice turns should fail fast instead of waiting on retry backoff.
  const MAX_RETRIES = channel === "voice" ? 0 : 1;
  const RETRY_DELAY_MS = 350;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (provider === "openai") {
        return await getAssistantResponseWithOpenAI(message, langCode, conversationHistory, channel);
      }

      return await getAssistantResponseWithGemini(message, langCode, conversationHistory, channel);
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      const isRetryable =
        !err?.status || err.status >= 500 || err.message?.includes("fetch");

      if (attempt < MAX_RETRIES && isRetryable) {
        console.warn(`[Response Engine] Attempt ${attempt + 1} failed, retrying...`, err.message);
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

  return { reply: "Something went wrong. Please try again.", escalate: false };
}

export type StreamChunk =
  | { type: "delta"; text: string }
  | { type: "done"; reply: string; escalate: boolean; reason?: EscalationReason };

/** Stream Gemini tokens for faster voice playback. Falls back to single chunk for OpenAI. */
export async function* streamAssistantResponse(
  message: string,
  language: string,
  conversationHistory: ChatMessage[] = [],
  channel: "voice" | "text" = "voice"
): AsyncGenerator<StreamChunk> {
  const config = getHotelConfig();
  const langCode =
    resolveSupportedLanguageCode(language) ??
    resolveSupportedLanguageCode(config.language) ??
    "en-US";
  const provider = getActiveAiProvider();

  if (provider !== "gemini") {
    const result = await getAssistantResponse(message, langCode, conversationHistory, channel);
    yield { type: "delta", text: result.reply };
    yield { type: "done", reply: result.reply, escalate: result.escalate, reason: result.reason };
    return;
  }

  const limit = historyLimit(channel);
  const userContent = await prepareUserMessage(message, conversationHistory, channel, langCode);
  const history: Content[] = conversationHistory.slice(-limit).map((msg) => ({
    role: msg.role === "user" ? "user" : "model",
    parts: [{ text: msg.content }],
  }));

  try {
    const model = getGeminiModel(channel);
    const stream = await model.generateContentStream({
      contents: [...history, { role: "user", parts: [{ text: userContent }] }],
    });

    let fullText = "";
    for await (const chunk of stream.stream) {
      const text = chunk.text();
      if (!text) continue;
      fullText += text;
      yield { type: "delta", text };
    }

    const { reply, escalate, reason } = resolveEscalation(fullText.trim());
    yield { type: "done", reply, escalate, reason: escalate ? reason : undefined };
  } catch (error) {
    console.error("Stream Response Engine Error:", error);
    const fallback =
      "I apologize — I'm having trouble right now. I've alerted our front desk team.";
    yield { type: "delta", text: fallback };
    yield { type: "done", reply: fallback, escalate: true, reason: "ai_error" };
  }
}
