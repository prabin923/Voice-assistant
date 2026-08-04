import { NextResponse } from "next/server";
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

async function callGemini(systemInstruction: string, history: ReturnType<typeof sanitizeChatHistory>, userContent: string, channel: ChatChannel): Promise<{ reply: string; escalate: boolean }> {
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
  const geminiHistory = history.slice(-limit).map((m) => ({
    role: m.role === "user" ? "user" as const : "model" as const,
    parts: [{ text: m.content }],
  }));

  const result = await model.generateContent({
    contents: [...geminiHistory, { role: "user", parts: [{ text: userContent }] }],
  });

  const text = result.response.text().trim();
  const { reply, escalate } = resolveEscalation(text);
  return { reply, escalate };
}

async function callOpenAI(systemInstruction: string, history: ReturnType<typeof sanitizeChatHistory>, userContent: string, channel: ChatChannel): Promise<{ reply: string; escalate: boolean }> {
  const openai = new OpenAI({ apiKey: getOpenAiApiKey() });
  const limit = channel === "voice" ? 6 : 12;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemInstruction },
    ...history.slice(-limit).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: userContent },
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    max_tokens: channel === "voice" ? 90 : 450,
    temperature: channel === "voice" ? 0.3 : 0.4,
  });

  const text = completion.choices[0]?.message?.content?.trim() ?? "";
  const { reply, escalate } = resolveEscalation(text);
  return { reply, escalate };
}

function safeHotelBlock(cfg: HotelConfig, slug: string | null, fallbackName: string): string {
  // Ensure all fields buildHotelDataBlock accesses exist
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
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429 }
      );
    }

    const message = sanitizeChatMessage(body.message);
    if (!message) {
      return NextResponse.json({ error: "A valid message string is required." }, { status: 400 });
    }

    if (!isAiConfigured()) {
      return NextResponse.json(aiNotConfiguredResponse(), { status: 501 });
    }

    const channel: ChatChannel = body.channel === "voice" ? "voice" : "text";
    const langCode = body.language || "en-US";
    const conversationHistory = sanitizeChatHistory(body.history);

    const startTime = Date.now();

    // --- Tourist Guide Flow: handle itineraries directly, inject context for others ---
    const guideResult = handleTouristGuideFlow(message, channel);
    if (guideResult.handled && guideResult.reply) {
      return NextResponse.json({
        reply: guideResult.reply,
        escalated: false,
        language: langCode,
        responseTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
    }

    const { hotelCount, hotelBlocks } = await loadHotelDirectory();

    // Inject tourism knowledge into the system prompt when relevant
    const tourismContext = guideResult.passToLlm ? guideResult.tourismContext : undefined;
    const systemInstruction = buildStayNepSystemInstruction(channel, hotelCount, hotelBlocks, tourismContext);

    const provider = getActiveAiProvider();
    const { reply, escalate } = provider === "openai"
      ? await callOpenAI(systemInstruction, conversationHistory, message, channel)
      : await callGemini(systemInstruction, conversationHistory, message, channel);

    return NextResponse.json({
      reply,
      escalated: escalate,
      language: langCode,
      responseTimeMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("StayNep chat error:", error);
    return NextResponse.json({ error: "An error occurred." }, { status: 500 });
  }
}
