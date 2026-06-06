import { NextResponse } from "next/server";
import { GoogleGenAI, Modality } from "@google/genai";
import { requireAiAccess } from "@/lib/aiAccessGuard";
import { getGeminiApiKey, geminiNotConfiguredResponse } from "@/lib/gemini";
import { GEMINI_LIVE_MODEL } from "@/lib/geminiModel";
import { buildSystemInstruction } from "@/lib/responseEngine";
import { checkRateLimit, getClientIP } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/** Issue a short-lived token so the browser can connect to Gemini Live API without exposing the API key. */
export async function POST(req: Request) {
  const access = await requireAiAccess(req, "live");
  if (!access.allowed) return access.response;

  const ip = getClientIP(req);
  const limit = checkRateLimit(`live-token:${ip}`, { maxRequests: 10, windowMs: 60000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return NextResponse.json(geminiNotConfiguredResponse(), { status: 501 });
  }

  try {
    const client = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: "v1alpha" },
    });

    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const token = await client.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime: new Date(Date.now() + 60 * 1000).toISOString(),
        liveConnectConstraints: {
          model: GEMINI_LIVE_MODEL,
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: { parts: [{ text: buildSystemInstruction() }] },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
        },
        httpOptions: { apiVersion: "v1alpha" },
      },
    });

    return NextResponse.json({
      token: token.name,
      model: GEMINI_LIVE_MODEL,
      apiVersion: "v1alpha",
    });
  } catch (error) {
    console.error("Gemini Live token error:", error);
    return NextResponse.json(
      { error: "Failed to create Gemini Live session token." },
      { status: 500 }
    );
  }
}
