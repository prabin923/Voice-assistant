import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { ensureDbReady } from "@/lib/db";
import prisma from "@/lib/prisma";
import { buildHotelDataBlock } from "@/lib/rag/augmentMessage";
import { getClientIP } from "@/lib/rateLimit";
import { isAiConfigured, getActiveAiProvider, aiNotConfiguredResponse } from "@/lib/ai";
import { getGeminiApiKey } from "@/lib/gemini";
import { GEMINI_MODEL } from "@/lib/geminiModel";
import { getOpenAiApiKey } from "@/lib/openai";
import { resolveEscalation } from "@/lib/escalation";
import { sanitizeChatMessage, sanitizeChatHistory } from "@/lib/chatValidation";
import { checkGuestChatRateLimit } from "@/lib/guestRateLimit";
import type { HotelConfig } from "@/lib/hotelConfig";
import { handleTouristGuideFlow, buildTourismSystemContext } from "@/lib/touristGuideFlow";

export const dynamic = "force-dynamic";

type ChatChannel = "voice" | "text";

interface HotelRow {
  id: string;
  name: string;
  slug: string | null;
  config: string;
}

function encodeSse(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function parseHotelConfig(raw: string): HotelConfig | null {
  try {
    return JSON.parse(raw) as HotelConfig;
  } catch {
    return null;
  }
}

function buildStayNepSystemInstruction(channel: ChatChannel, hotelCount: number, hotelBlocks: string[], tourismContext?: string): string {
  const compact = channel === "voice";

  const voiceRules = compact
    ? `VOICE STYLE:
- 1–2 short sentences only. Warm, conversational. No lists, no bullet points.
- Use contractions (we've, there's, it's). Sound like a knowledgeable travel advisor who loves Nepal.`
    : "";

  const directory = hotelBlocks.join("\n---\n");

  const tourismBlock = tourismContext
    ? `\n\nTOURISM KNOWLEDGE (use for destination/activity/travel questions):\n${tourismContext}`
    : "";

  return `You are StayNep — Nepal's AI travel assistant, tourist guide, and hotel concierge.
You are an expert on Nepal tourism: destinations, trekking routes, activities, festivals, culture, food, and practical travel advice.
You also help guests discover and choose from ${hotelCount} hotel${hotelCount !== 1 ? "s" : ""} registered on the StayNep platform.
${voiceRules}

CAPABILITIES:
- Be a complete Nepal travel guide — recommend destinations, activities, local food, festivals, and practical tips
- Generate personalized day-by-day itineraries for any trip length
- Advise on trekking routes (difficulty, permits, season, gear, altitude)
- Share practical travel info: visa, currency, safety, transport, customs, weather
- List all hotels or filter by location, price, amenity, or style
- Compare hotels side-by-side when asked
- Answer detailed questions about any hotel's rooms, policies, dining, or facilities
- When a guest is ready to book a hotel, direct them: "To book with [Hotel Name], use their voice concierge directly — just say the hotel name or go to their page."
- Cross-reference hotel recommendations with destination itineraries

TONE: Warm, knowledgeable, and passionate about Nepal — like a well-travelled local advisor who knows every trail, temple, and tea shop. Enthusiastic but not pushy. Not a generic chatbot.

GROUNDING:
- For hotel-specific info: use ONLY the HOTEL DIRECTORY below. Never invent hotels, prices, or availability.
- For tourism/travel info: use the TOURISM KNOWLEDGE provided. Answer confidently about destinations, activities, and travel advice.
- If asked about a hotel not in the directory: "That hotel isn't on StayNep yet — but I can recommend great stays in that area!"
- If asked about something completely outside Nepal travel: "I'm your Nepal travel specialist! Ask me anything about visiting Nepal."

Reply in the same language the guest is writing in.

${buildTourismSystemContext()}

HOTEL DIRECTORY:
${directory}${tourismBlock}`;
}

function safeHotelBlock(cfg: HotelConfig, slug: string | null, fallbackName: string): string {
  if (!cfg.branding) cfg.branding = { hotelName: fallbackName, tagline: "", accentColor: "#e96b34", welcomeMessage: "", farewellMessage: "" };
  if (!cfg.branding.hotelName) cfg.branding.hotelName = fallbackName;
  if (!cfg.contact) cfg.contact = { phone: "N/A", email: "N/A", address: "N/A", city: "N/A", country: "N/A" };
  if (!cfg.policies) cfg.policies = { checkInTime: "N/A", checkOutTime: "N/A", cancellationPolicy: "N/A", petPolicy: "N/A", smokingPolicy: "N/A", extraBedPolicy: "N/A", childPolicy: "N/A" };
  if (!Array.isArray(cfg.rooms)) cfg.rooms = [];
  if (!Array.isArray(cfg.amenities)) cfg.amenities = [];
  if (!Array.isArray(cfg.dining)) cfg.dining = [];
  if (!Array.isArray(cfg.customFAQ)) cfg.customFAQ = [];

  try {
    return `[Hotel slug: ${slug}]\n${buildHotelDataBlock(cfg, false)}`;
  } catch {
    return `[Hotel slug: ${slug}]\n- Hotel: ${cfg.branding.hotelName}, ${cfg.contact.city}, ${cfg.contact.country}`;
  }
}

async function loadHotelDirectory(): Promise<{ hotelCount: number; hotelBlocks: string[] }> {
  await ensureDbReady();

  const rows = await prisma.hotel.findMany({
    where: { slug: { not: null } },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, slug: true, config: true },
  }) as HotelRow[];

  const hotelBlocks: string[] = [];
  for (const row of rows) {
    const cfg = parseHotelConfig(row.config);
    if (!cfg) continue;
    hotelBlocks.push(safeHotelBlock(cfg, row.slug, row.name));
  }

  return { hotelCount: rows.length, hotelBlocks };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      message?: unknown;
      language?: string;
      history?: unknown;
      channel?: string;
    };

    const ip = getClientIP(req);
    const chatLimit = await checkGuestChatRateLimit({ ip });
    if (!chatLimit.allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a moment." }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }

    const message = sanitizeChatMessage(body.message);
    if (!message) {
      return new Response(JSON.stringify({ error: "A valid message is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!isAiConfigured()) {
      return new Response(JSON.stringify(aiNotConfiguredResponse()), {
        status: 501,
        headers: { "Content-Type": "application/json" },
      });
    }

    const channel: ChatChannel = body.channel === "voice" ? "voice" : "text";
    const langCode = body.language || "en-US";
    const conversationHistory = sanitizeChatHistory(body.history);

    // --- Tourist Guide Flow: handle itineraries directly (SSE single chunk) ---
    const guideResult = handleTouristGuideFlow(message, channel);
    if (guideResult.handled && guideResult.reply) {
      const directStream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          const push = (data: unknown) => controller.enqueue(encoder.encode(encodeSse(data)));
          push({ type: "delta", text: guideResult.reply });
          push({ type: "done", reply: guideResult.reply, escalated: false });
          controller.close();
        },
      });
      return new Response(directStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const { hotelCount, hotelBlocks } = await loadHotelDirectory();

    // Inject tourism knowledge into the system prompt when relevant
    const tourismContext = guideResult.passToLlm ? guideResult.tourismContext : undefined;
    const systemInstruction = buildStayNepSystemInstruction(channel, hotelCount, hotelBlocks, tourismContext);

    const provider = getActiveAiProvider();

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const push = (data: unknown) => controller.enqueue(encoder.encode(encodeSse(data)));

        try {
          if (provider !== "gemini") {
            const openai = new OpenAI({ apiKey: getOpenAiApiKey() });
            const limit = channel === "voice" ? 6 : 12;
            const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
              { role: "system", content: systemInstruction },
              ...conversationHistory.slice(-limit).map((m) => ({
                role: m.role as "user" | "assistant",
                content: m.content,
              })),
              { role: "user", content: message },
            ];

            const completion = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages,
              max_tokens: channel === "voice" ? 90 : 450,
              temperature: channel === "voice" ? 0.3 : 0.4,
            });

            const text = completion.choices[0]?.message?.content?.trim() ?? "";
            const { reply, escalate } = resolveEscalation(text);
            push({ type: "delta", text: reply });
            push({ type: "done", reply, escalated: escalate });
            controller.close();
            return;
          }

          // Gemini streaming
          const genAi = new GoogleGenerativeAI(getGeminiApiKey() || "");
          const model = genAi.getGenerativeModel({
            model: GEMINI_MODEL,
            systemInstruction,
            generationConfig: {
              maxOutputTokens: channel === "voice" ? 90 : 450,
              temperature: channel === "voice" ? 0.3 : 0.4,
            },
          });

          const limit = channel === "voice" ? 6 : 12;
          const geminiHistory = conversationHistory.slice(-limit).map((m) => ({
            role: m.role === "user" ? "user" as const : "model" as const,
            parts: [{ text: m.content }],
          }));

          const geminiStream = await model.generateContentStream({
            contents: [...geminiHistory, { role: "user", parts: [{ text: message }] }],
          });

          let fullText = "";
          for await (const chunk of geminiStream.stream) {
            const text = chunk.text();
            if (!text) continue;
            fullText += text;
            push({ type: "delta", text });
          }

          const { reply, escalate } = resolveEscalation(fullText.trim());
          push({ type: "done", reply, escalated: escalate });
        } catch (error) {
          console.error("StayNep stream error:", error);
          const fallback = "I'm having trouble right now — please try again in a moment.";
          push({ type: "delta", text: fallback });
          push({ type: "done", reply: fallback, escalated: false });
        }

        controller.close();
        return undefined;
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("StayNep chat stream error:", error);
    return new Response(encodeSse({ type: "error", error: "Stream failed." }), {
      status: 500,
      headers: { "Content-Type": "text/event-stream" },
    });
  }
}
