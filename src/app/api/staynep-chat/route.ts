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

function buildStayNepSystemInstruction(channel: ChatChannel, hotelCount: number, hotelBlocks: string[]): string {
  const compact = channel === "voice";

  const voiceRules = compact
    ? `VOICE STYLE:
- 1–2 short sentences only. Warm, conversational. No lists, no bullet points.
- Use contractions (we've, there's, it's). Sound like a helpful travel advisor.`
    : "";

  const directory = hotelBlocks.join("\n---\n");

  return `You are StayNep, the AI travel assistant for the StayNep hotel platform.
You help guests discover and choose from ${hotelCount} hotel${hotelCount !== 1 ? "s" : ""} registered on StayNep.
${voiceRules}

CAPABILITIES:
- List all hotels or filter by location, price, amenity, or style
- Compare hotels side-by-side when asked
- Answer detailed questions about any hotel's rooms, policies, dining, or facilities
- When a guest is ready to book, direct them: "To book with [Hotel Name], use their voice concierge directly — just say the hotel name or go to their page."

TONE: Warm, knowledgeable platform host — like a well-travelled advisor who knows each property personally. Not a generic chatbot.

GROUNDING: Answer ONLY from the HOTEL DIRECTORY below. Never invent hotels, prices, amenities, or availability.
If a guest asks about something not in the directory, say: "I don't have that detail for this hotel — I'd recommend reaching out to them directly."

Reply in the same language the guest is writing in.

HOTEL DIRECTORY:
${directory}`;
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

    const { hotelCount, hotelBlocks } = await loadHotelDirectory();
    const systemInstruction = buildStayNepSystemInstruction(channel, hotelCount, hotelBlocks);

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
