import { NextResponse } from "next/server";
import { requireAiAccess } from "@/lib/aiAccessGuard";
import { checkRateLimit, getClientIP } from "@/lib/rateLimit";
import {
  isNemotronVoiceConfigured,
  resolveNemotronVoice,
  synthesizeWithNemotronVoice,
  type NemotronVoicePersona,
} from "@/lib/nemotronVoice";
import { isMinimaxTtsConfigured, synthesizeWithMinimaxTts } from "@/lib/minimaxTts";
import { isEdgeTtsAvailable, synthesizeWithEdgeTts } from "@/lib/edgeTts";
import { isOpenAiTtsConfigured, synthesizeWithOpenAiTts } from "@/lib/openaiTts";
import { isServerTtsConfigured } from "@/lib/serverTts";
import { sanitizeForSpeech as sanitizeSpeechText } from "@/lib/humanizeSpeech";
import { isFreeVoiceStack } from "@/lib/voiceStack";

export const dynamic = "force-dynamic";

const MAX_TEXT_LENGTH = 4000;

function parseVoiceStyle(value: unknown): NemotronVoicePersona {
  if (value === "professional" || value === "energetic" || value === "warm") {
    return value;
  }
  return "warm";
}

function sanitizeLanguage(language: unknown): string {
  return String(language || "en-US")
    .replace(/[^a-zA-Z0-9\-]/g, "")
    .slice(0, 12);
}

export async function GET() {
  return NextResponse.json({
    serverTtsReady: isServerTtsConfigured(),
    voiceStack: isFreeVoiceStack() ? "free" : "cloud",
    minimaxTtsReady: isMinimaxTtsConfigured(),
    nemotronVoiceReady: isNemotronVoiceConfigured(),
    openAiTtsReady: isOpenAiTtsConfigured(),
    edgeTtsReady: isEdgeTtsAvailable(),
  });
}

export async function POST(req: Request) {
  try {
    if (!isServerTtsConfigured()) {
      return NextResponse.json(
        {
          error: "Server TTS not configured.",
          details: isFreeVoiceStack()
            ? "Edge TTS should work automatically. Restart the dev server."
            : "Set MINIMAX_API_KEY + MINIMAX_GROUP_ID, OPENAI_API_KEY, or NEMOTRON_TTS_ENDPOINT for speech playback.",
        },
        { status: 501 }
      );
    }

    const access = await requireAiAccess(req, "tts");
    if (!access.allowed) return access.response;

    const ip = getClientIP(req);
    const limit = checkRateLimit(`tts:${ip}`, { maxRequests: 40, windowMs: 60_000 });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many TTS requests. Please wait." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) },
        }
      );
    }

    const body = await req.json();
    const text = sanitizeSpeechText(String(body.text ?? ""));
    const language = sanitizeLanguage(body.language);
    const voiceStyle = parseVoiceStyle(body.voiceStyle);

    if (!text) {
      return NextResponse.json({ error: "No text provided." }, { status: 400 });
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `Text too long. Maximum ${MAX_TEXT_LENGTH} characters.` },
        { status: 413 }
      );
    }

    if (isFreeVoiceStack()) {
      const edge = await synthesizeWithEdgeTts({ text, language, voiceStyle });
      if (edge.audio) {
        return new NextResponse(new Uint8Array(edge.audio), {
          status: 200,
          headers: {
            "Content-Type": edge.contentType ?? "audio/mpeg",
            "Cache-Control": "no-store",
            "X-TTS-Provider": "edge-tts",
          },
        });
      }
      console.warn("[TTS] Edge TTS failed in free stack:", edge.error);
    }

    if (isMinimaxTtsConfigured()) {
      const minimax = await synthesizeWithMinimaxTts({ text, language, voiceStyle });
      if (minimax.audio) {
        return new NextResponse(new Uint8Array(minimax.audio), {
          status: 200,
          headers: {
            "Content-Type": minimax.contentType ?? "audio/mpeg",
            "Cache-Control": "no-store",
            "X-TTS-Provider": "minimax-tts",
          },
        });
      }
      console.warn("[TTS] MiniMax failed, falling back:", minimax.error);
    }

    if (isNemotronVoiceConfigured()) {
      if (!resolveNemotronVoice(language, voiceStyle)) {
        return NextResponse.json(
          { error: "Language not supported by Nemotron TTS.", fallback: true },
          { status: 422 }
        );
      }

      const nemotron = await synthesizeWithNemotronVoice({ text, language, voiceStyle });
      if (nemotron.audio) {
        return new NextResponse(new Uint8Array(nemotron.audio), {
          status: 200,
          headers: {
            "Content-Type": nemotron.contentType ?? "audio/wav",
            "Cache-Control": "no-store",
            "X-TTS-Provider": "nemotron-tts",
          },
        });
      }
      if (!isOpenAiTtsConfigured()) {
        if (nemotron.unsupportedLanguage) {
          return NextResponse.json({ error: nemotron.error, fallback: true }, { status: 422 });
        }
        return NextResponse.json({ error: nemotron.error ?? "Synthesis failed." }, { status: 502 });
      }
      console.warn("[TTS] Nemotron failed, falling back to OpenAI:", nemotron.error);
    }

    if (isOpenAiTtsConfigured()) {
      const openAi = await synthesizeWithOpenAiTts({ text, voiceStyle });
      if (openAi.audio) {
        return new NextResponse(new Uint8Array(openAi.audio), {
          status: 200,
          headers: {
            "Content-Type": openAi.contentType ?? "audio/mpeg",
            "Cache-Control": "no-store",
            "X-TTS-Provider": "openai-tts",
          },
        });
      }
      console.warn("[TTS] OpenAI failed, falling back to Edge TTS:", openAi.error);
    }

    const edge = await synthesizeWithEdgeTts({ text, language, voiceStyle });
    if (!edge.audio) {
      return NextResponse.json({ error: edge.error ?? "Synthesis failed." }, { status: 502 });
    }

    return new NextResponse(new Uint8Array(edge.audio), {
      status: 200,
      headers: {
        "Content-Type": edge.contentType ?? "audio/mpeg",
        "Cache-Control": "no-store",
        "X-TTS-Provider": "edge-tts",
      },
    });
  } catch (error) {
    console.error("[TTS API Error]", error);
    return NextResponse.json({ error: "Speech synthesis failed." }, { status: 500 });
  }
}
