import { GoogleGenerativeAI, Content } from "@google/generative-ai";
import OpenAI from "openai";
import { getActiveAiProvider } from "@/lib/ai";
import { getGeminiApiKey } from "@/lib/gemini";
import { GEMINI_MODEL } from "@/lib/geminiModel";
import { getOpenAiApiKey } from "@/lib/openai";
import { resolveEscalation, type EscalationReason } from "@/lib/escalation";
import { getHotelConfig } from "./hotelConfig";

function getGenAI() {
  return new GoogleGenerativeAI(getGeminiApiKey() || "");
}

export function buildSystemInstruction(): string {
  const config = getHotelConfig();

  return `You are the Senior AI Receptionist at ${config.branding.hotelName}.

PERSONA:
${config.receptionistPersona}
You are hospitable, professional, and helpful. You do NOT make up your own questions. You ONLY answer the guest's question.

CRITICAL RULES:
- NEVER invent or fabricate questions on behalf of the guest.
- NEVER repeat the guest's question back to them as if you asked it.
- Read the guest's message carefully and respond DIRECTLY to what they said.
- If the message is a greeting like "hello" or "hi", greet them back warmly and ask how you can help.
- You REMEMBER the full conversation. Use context from earlier messages when relevant.

HOTEL DATA:
- Hotel Name: ${config.branding.hotelName}
- Phone: ${config.contact.phone}
- Email: ${config.contact.email}
- Address: ${config.contact.address}
- Check-in: ${config.policies.checkInTime}
- Check-out: ${config.policies.checkOutTime}
- Cancellation: ${config.policies.cancellationPolicy}
- Amenities: ${config.amenities.map(a => `${a.name} (${a.description})`).join(", ")}
- Room Types: ${config.rooms.map(r => `${r.name}: ${r.currency}${r.pricePerNight}/night, max ${r.maxOccupancy} guests`).join("; ")}

RESPONSE RULES:
1. Respond strictly in the language matching this code: the language the guest uses.
2. Keep responses concise and warm — this is a voice interaction.
3. If the guest asks about something NOT in the hotel data, OR makes a complaint, OR needs human action (booking changes, billing, emergencies), add [ESCALATE] at the very end of your response.
4. If the guest asks to speak to a human/staff/manager/front desk, add [ESCALATE] at the end.
5. If the guest's message is unclear, garbled, incomplete, off-topic, or you cannot confidently determine what they need, apologize briefly, say a staff member will help, and add [ESCALATE].
6. If you cannot answer confidently from HOTEL DATA alone (missing info, ambiguous policy, special requests), do NOT guess — add [ESCALATE] and tell the guest staff will follow up.
7. Do NOT add [ESCALATE] for normal informational questions you can answer from HOTEL DATA.
8. Give fresh, natural replies. Do not just list facts unless the guest specifically asks for a list.`;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

async function getAssistantResponseWithOpenAI(
  message: string,
  langCode: string,
  conversationHistory: ChatMessage[]
): Promise<{ reply: string; escalate: boolean; reason?: EscalationReason }> {
  const openai = new OpenAI({ apiKey: getOpenAiApiKey() });
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: buildSystemInstruction() },
    ...conversationHistory.slice(-10).map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    })),
    { role: "user", content: `[Guest speaks in ${langCode}]: ${message}` },
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    max_tokens: 400,
    temperature: 0.5,
  });

  const text = completion.choices[0]?.message?.content?.trim() ?? "";
  const { reply, escalate, reason } = resolveEscalation(text);
  return { reply, escalate, reason: escalate ? reason : undefined };
}

async function getAssistantResponseWithGemini(
  message: string,
  langCode: string,
  conversationHistory: ChatMessage[]
): Promise<{ reply: string; escalate: boolean; reason?: EscalationReason }> {
  const model = getGenAI().getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: buildSystemInstruction(),
    generationConfig: {
      maxOutputTokens: 400,
      temperature: 0.5,
    },
  });

  const history: Content[] = conversationHistory
    .slice(-10)
    .map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(`[Guest speaks in ${langCode}]: ${message}`);
  const text = result.response.text().trim();
  const { reply, escalate, reason } = resolveEscalation(text);
  return { reply, escalate, reason: escalate ? reason : undefined };
}

export async function getAssistantResponse(
  message: string,
  language: string,
  conversationHistory: ChatMessage[] = []
): Promise<{ reply: string; escalate: boolean; reason?: EscalationReason }> {
  const config = getHotelConfig();
  const langCode = language || config.language || "en-US";
  const provider = getActiveAiProvider();

  const MAX_RETRIES = 1;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (provider === "openai") {
        return await getAssistantResponseWithOpenAI(message, langCode, conversationHistory);
      }

      return await getAssistantResponseWithGemini(message, langCode, conversationHistory);
    } catch (error: any) {
      const isRetryable =
        !error?.status || error.status >= 500 || error.message?.includes("fetch");

      if (attempt < MAX_RETRIES && isRetryable) {
        console.warn(`[Response Engine] Attempt ${attempt + 1} failed, retrying in 1s...`, error.message);
        await new Promise((r) => setTimeout(r, 1000));
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
