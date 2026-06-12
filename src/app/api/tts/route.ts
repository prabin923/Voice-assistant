import { NextResponse } from "next/server";
import { requireAiAccess } from "@/lib/aiAccessGuard";
import { checkRateLimit, getClientIP } from "@/lib/rateLimit";
import {
  isNemotronVoiceConfigured,
  resolveNemotronVoice,
  synthesizeWithNemotronVoice,
  type NemotronVoicePersona,
} from "@/lib/nemotronVoice";
import { sanitizeForSpeech as sanitizeSpeechText } from "@/lib/humanizeSpeech";

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
  return NextResponse.json({ nemotronVoiceReady: isNemotronVoiceConfigured() });
}

export async function POST(req: Request) {
  try {
    if (!isNemotronVoiceConfigured()) {
      return NextResponse.json(
        {
          error: "Nemotron TTS not configured.",
          details: "Set NEMOTRON_TTS_ENDPOINT (and NVIDIA_API_KEY when required by your NIM).",
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

    if (!resolveNemotronVoice(language, voiceStyle)) {
      return NextResponse.json(
        {
          error: "Language not supported by Nemotron TTS.",
          fallback: true,
        },
        { status: 422 }
      );
    }

    const result = await synthesizeWithNemotronVoice({ text, language, voiceStyle });
    if (result.unsupportedLanguage) {
      return NextResponse.json(
        { error: result.error, fallback: true },
        { status: 422 }
      );
    }
    if (!result.audio) {
      return NextResponse.json({ error: result.error ?? "Synthesis failed." }, { status: 502 });
    }

    return new NextResponse(new Uint8Array(result.audio), {
      status: 200,
      headers: {
        "Content-Type": result.contentType ?? "audio/wav",
        "Cache-Control": "no-store",
        "X-TTS-Provider": "nemotron-tts",
      },
    });
  } catch (error) {
    console.error("[TTS API Error]", error);
    return NextResponse.json({ error: "Speech synthesis failed." }, { status: 500 });
  }
}
