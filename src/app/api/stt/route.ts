import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { requireAiAccess } from "@/lib/aiAccessGuard";
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';
import { getGeminiApiKey, mapGeminiApiError } from '@/lib/gemini';
import { GEMINI_MODEL } from '@/lib/geminiModel';
import {
  isSelfHostedSttConfigured,
  transcribeWithLocalWhisper,
  transcribeWithWhisperServer,
} from '@/lib/selfHostedStt';
import { isNemotronAsrConfigured, transcribeWithNemotron } from '@/lib/nemotronTranscribe';
import { isFreeVoiceStack, shouldUseWhisperHttpServer } from '@/lib/voiceStack';

export const dynamic = 'force-dynamic';

const MAX_AUDIO_SIZE = 10 * 1024 * 1024;
const MIN_AUDIO_SIZE = 512;
const ALLOWED_AUDIO_TYPES = new Set([
  "audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg",
  "audio/wav", "audio/x-wav", "audio/flac"
]);

function isSttAvailable(): boolean {
  return isNemotronAsrConfigured() || isSelfHostedSttConfigured() || Boolean(getGeminiApiKey());
}

export async function POST(req: Request) {
  try {
    const access = await requireAiAccess(req, "stt");
    if (!access.allowed) return access.response;

    const ip = getClientIP(req);
    const limit = checkRateLimit(`stt:${ip}`, { maxRequests: 30, windowMs: 60000 });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many transcription requests. Please wait." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } }
      );
    }

    const formData = await req.formData();
    const audioBlob = formData.get('audio') as Blob;
    const language = formData.get('language') as string;

    if (!audioBlob) {
      return NextResponse.json({ error: 'No audio provided.' }, { status: 400 });
    }

    if (audioBlob.size < MIN_AUDIO_SIZE) {
      return NextResponse.json(
        { error: 'Recording too short. Please speak clearly and try again.' },
        { status: 422 }
      );
    }

    if (audioBlob.size > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        { error: `Audio file too large. Maximum size is ${MAX_AUDIO_SIZE / 1024 / 1024}MB.` },
        { status: 413 }
      );
    }

    const mimeType = audioBlob.type || "audio/webm";
    const baseMime = mimeType.split(";")[0].trim();
    if (!ALLOWED_AUDIO_TYPES.has(baseMime)) {
      return NextResponse.json(
        { error: `Unsupported audio format: ${mimeType}` },
        { status: 400 }
      );
    }

    if (!isSttAvailable()) {
      return NextResponse.json(
        {
          error: "Speech-to-text not configured.",
          details: isFreeVoiceStack()
            ? "Start Whisper: npm run whisper:up (or ./scripts/setup-local-whisper.sh). Set WHISPER_STT_ENDPOINT=http://127.0.0.1:8000/v1"
            : "Set NEMOTRON_ASR_ENDPOINT, WHISPER_STT_ENDPOINT, or GOOGLE_GENERATIVE_AI_API_KEY.",
        },
        { status: 501 }
      );
    }

    const safeLang = (language || "en-US").replace(/[^a-zA-Z0-9\-]/g, "").slice(0, 10);
    const audioBuffer = Buffer.from(await audioBlob.arrayBuffer());

    // Free / college stack: open-source Whisper first (local or Docker)
    if (isFreeVoiceStack()) {
      const localResult = await transcribeWithLocalWhisper(audioBuffer);
      if (localResult.text) {
        return NextResponse.json({ text: localResult.text, provider: "whisper-local" });
      }

      if (shouldUseWhisperHttpServer()) {
        const serverResult = await transcribeWithWhisperServer(
          new Blob([audioBuffer], { type: baseMime }),
          safeLang
        );
        if (serverResult.text) {
          return NextResponse.json({ text: serverResult.text, provider: "whisper-server" });
        }
      }
    } else {
      // Cloud stack: Nemotron ASR first when configured
      let nemotronError: string | undefined;
      if (isNemotronAsrConfigured()) {
        const nemotronResult = await transcribeWithNemotron(
          new Blob([audioBuffer], { type: baseMime }),
          baseMime,
          { language: safeLang }
        );
        if (nemotronResult.text) {
          return NextResponse.json({ text: nemotronResult.text, provider: "nemotron-asr" });
        }
        nemotronError = nemotronResult.error;
        console.warn("[STT] Nemotron ASR did not return text:", nemotronError ?? "empty");
      }

      if (shouldUseWhisperHttpServer()) {
        const serverResult = await transcribeWithWhisperServer(
          new Blob([audioBuffer], { type: baseMime }),
          safeLang
        );
        if (serverResult.text) {
          return NextResponse.json({ text: serverResult.text, provider: "whisper-server" });
        }
      }

      const localResult = await transcribeWithLocalWhisper(audioBuffer);
      if (localResult.text) {
        return NextResponse.json({ text: localResult.text, provider: "whisper-local" });
      }
    }

    // Gemini multimodal fallback (uses API quota)
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      const localTry = await transcribeWithLocalWhisper(audioBuffer);
      const serverTry = shouldUseWhisperHttpServer()
        ? await transcribeWithWhisperServer(new Blob([audioBuffer], { type: baseMime }), safeLang)
        : { error: "Whisper server not configured" };
      const err = serverTry.error || localTry.error || "STT unavailable";
      return NextResponse.json({ error: err }, { status: 502 });
    }

    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: GEMINI_MODEL });
    const base64Audio = audioBuffer.toString("base64");
    const prompt = `Transcribe this audio strictly. Language is ${safeLang}. Only return the transcribed text, nothing else. If there is no speech, return EMPTY.`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType: baseMime, data: base64Audio } },
    ]);

    let transcription = "";
    try {
      transcription = result.response.text().trim();
    } catch {
      return NextResponse.json({ error: 'No speech detected. Please try again.' }, { status: 422 });
    }

    if (!transcription || transcription.toUpperCase() === "EMPTY") {
      console.warn("[STT] All providers returned empty.");
      return NextResponse.json(
        { error: "No speech detected. Please try again.", fallbackNative: true },
        { status: 422 }
      );
    }

    return NextResponse.json({ text: transcription, provider: "gemini" });

  } catch (error) {
    console.error('STT API Error:', error);
    const mapped = mapGeminiApiError(error);
    const headers: Record<string, string> = {};
    if (mapped.status === 429) headers["Retry-After"] = "60";
    return NextResponse.json({ error: mapped.error }, { status: mapped.status, headers });
  }
}
