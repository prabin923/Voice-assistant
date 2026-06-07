import { NextResponse } from "next/server";
import { requireAiAccess } from "@/lib/aiAccessGuard";
import { checkRateLimit, getClientIP } from "@/lib/rateLimit";
import {
  isMaiVoiceConfigured,
  resolveMaiVoice,
  synthesizeWithMaiVoice,
  type MaiVoicePersona,
} from "@/lib/maiVoice";
import { sanitizeForSpeech as sanitizeSpeechText } from "@/lib/humanizeSpeech";

export const dynamic = "force-dynamic";

const MAX_TEXT_LENGTH = 4000;

function parseVoiceStyle(value: unknown): MaiVoicePersona {
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
  return NextResponse.json({ maiVoiceReady: isMaiVoiceConfigured() });
}

export async function POST(req: Request) {
  try {
    if (!isMaiVoiceConfigured()) {
      return NextResponse.json(
        {
          error: "MAI Voice not configured.",
          details:
            "Set AZURE_SPEECH_KEY, AZURE_SPEECH_ENDPOINT, and AZURE_SPEECH_REGION (or MAI_VOICE_TTS_ENDPOINT).",
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

    if (!resolveMaiVoice(language, voiceStyle)) {
      return NextResponse.json(
        {
          error: "Language not supported by MAI Voice.",
          fallback: true,
        },
        { status: 422 }
      );
    }

    const result = await synthesizeWithMaiVoice({ text, language, voiceStyle });
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
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "X-TTS-Provider": "mai-voice",
      },
    });
  } catch (error) {
    console.error("[TTS API Error]", error);
    return NextResponse.json({ error: "Speech synthesis failed." }, { status: 500 });
  }
}
