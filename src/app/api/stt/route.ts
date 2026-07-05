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
import { isOpenAiWhisperConfigured, transcribeWithOpenAiWhisper } from '@/lib/openaiWhisper';
import { isFreeVoiceStack, shouldUseWhisperHttpServer } from '@/lib/voiceStack';
import { isJunkTranscription, sanitizeTranscription } from '@/lib/sttValidation';

export const dynamic = 'force-dynamic';

const MAX_AUDIO_SIZE = 10 * 1024 * 1024;
const MIN_AUDIO_SIZE = 512;
const ALLOWED_AUDIO_TYPES = new Set([
  "audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg",
  "audio/wav", "audio/x-wav", "audio/flac"
]);

// Expected Unicode block per non-Latin language, used to reject romanized /
// wrong-script transcriptions (small Whisper models romanize Nepali, Hindi, …).
const SCRIPT_RANGE: Record<string, RegExp> = {
  ne: /[ऀ-ॿ]/, hi: /[ऀ-ॿ]/, mr: /[ऀ-ॿ]/,
  ar: /[؀-ۿ]/, he: /[֐-׿]/, ta: /[஀-௿]/,
  te: /[ఀ-౿]/, bn: /[ঀ-৿]/, gu: /[઀-૿]/,
  pa: /[਀-੿]/, ml: /[ഀ-ൿ]/, si: /[඀-෿]/,
  th: /[฀-๿]/, lo: /[຀-໿]/, my: /[က-႟]/,
  ka: /[Ⴀ-ჿ]/, am: /[ሀ-፿]/, km: /[ក-៿]/,
  zh: /[一-鿿]/, ja: /[぀-ヿ一-鿿]/, ko: /[가-힯]/,
};
function primaryLangOf(safeLang: string): string {
  return safeLang.split("-")[0].toLowerCase();
}
function isNonLatinLang(safeLang: string): boolean {
  return Boolean(SCRIPT_RANGE[primaryLangOf(safeLang)]);
}
function hasExpectedScript(text: string, safeLang: string): boolean {
  const re = SCRIPT_RANGE[primaryLangOf(safeLang)];
  return !re || re.test(text);
}

// Accept a Whisper/Nemotron transcription only if it's non-junk AND, for a
// non-Latin language, actually in that language's script. Rejecting romanized
// output makes the cascade fall through to Gemini (which forces the script).
function acceptTranscription(text: string | undefined, safeLang: string): string | undefined {
  const cleaned = text ? sanitizeTranscription(text) : "";
  if (!cleaned || isJunkTranscription(cleaned)) return undefined;
  if (!hasExpectedScript(cleaned, safeLang)) return undefined;
  return cleaned;
}

const STT_SCRIPT_HINTS: Record<string, string> = {
  ne: "Write in Devanagari script (नेपाली).", hi: "Write in Devanagari script (हिन्दी).",
  mr: "Write in Devanagari script (मराठी).", ar: "Write in Arabic script (عربي).",
  he: "Write in Hebrew script (עברית).", ta: "Write in Tamil script (தமிழ்).",
  te: "Write in Telugu script (తెలుగు).", bn: "Write in Bengali script (বাংলা).",
  gu: "Write in Gujarati script (ગુજરાતી).", pa: "Write in Gurmukhi script (ਪੰਜਾਬੀ).",
  ml: "Write in Malayalam script (മലയാളം).", si: "Write in Sinhala script (සිංහල).",
  th: "Write in Thai script (ภาษาไทย).", lo: "Write in Lao script (ພາສາລາວ).",
  my: "Write in Myanmar script (မြန်မာ).", ka: "Write in Georgian script (ქართული).",
  am: "Write in Ethiopic script (አማርኛ).", km: "Write in Khmer script (ខ្មែរ).",
  zh: "Write in Chinese characters (中文).", ja: "Write in Japanese script (日本語).",
  ko: "Write in Korean script (한국어).",
};

/** Gemini multimodal STT — strong on non-Latin languages; script hint forces
 *  the correct (non-romanized) output. Returns sanitized text or an error. */
async function transcribeWithGemini(
  apiKey: string,
  audioBuffer: Buffer,
  baseMime: string,
  safeLang: string
): Promise<{ text?: string; error?: string }> {
  try {
    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: GEMINI_MODEL });
    const scriptHint = STT_SCRIPT_HINTS[primaryLangOf(safeLang)]
      ? ` The selected language is likely ${safeLang} — ${STT_SCRIPT_HINTS[primaryLangOf(safeLang)]}`
      : ` The selected language is likely ${safeLang}.`;
    // Auto-detect the spoken language and transcribe VERBATIM in its native
    // script — never translate to the selected language. This is what lets a
    // guest speak Nepali while the widget is set to English and still get
    // Devanagari text (not an English translation).
    const prompt =
      `You are a multilingual speech-to-text engine. Transcribe the EXACT words spoken, verbatim, ` +
      `in the language ACTUALLY spoken in the audio — detect it automatically.${scriptHint} ` +
      `If a different language is spoken, transcribe in THAT language instead. ` +
      `Always write using the spoken language's native script (Devanagari for Nepali/Hindi, ` +
      `Arabic script for Arabic, Han/Kana for Chinese/Japanese, Hangul for Korean, etc.). ` +
      `NEVER romanize a non-Latin language and NEVER translate. ` +
      `If silent or unintelligible, output exactly: EMPTY`;
    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType: baseMime, data: audioBuffer.toString("base64") } },
    ]);
    const transcription = sanitizeTranscription(result.response.text());
    if (!transcription || transcription.toUpperCase() === "EMPTY" || isJunkTranscription(transcription)) {
      return { error: "No speech detected." };
    }
    return { text: transcription };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Gemini STT failed" };
  }
}

function isSttAvailable(): boolean {
  return (
    isNemotronAsrConfigured() ||
    isSelfHostedSttConfigured() ||
    (!isFreeVoiceStack() && isOpenAiWhisperConfigured()) ||
    Boolean(getGeminiApiKey())
  );
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
            ? "Set GOOGLE_GENERATIVE_AI_API_KEY for Gemini STT, or point WHISPER_STT_ENDPOINT at a running Whisper server."
            : "Set NEMOTRON_ASR_ENDPOINT, WHISPER_STT_ENDPOINT, OPENAI_API_KEY, or GOOGLE_GENERATIVE_AI_API_KEY.",
        },
        { status: 501 }
      );
    }

    const safeLang = (language || "en-US").replace(/[^a-zA-Z0-9\-]/g, "").slice(0, 10);
    const audioBuffer = Buffer.from(await audioBlob.arrayBuffer());
    const geminiKey = getGeminiApiKey();
    let geminiAttempted = false;

    // Gemini auto-detects the spoken language and writes the correct script,
    // so a guest can speak Nepali while the widget is set to English and still
    // get Devanagari (not an English translation). Use it FIRST when:
    //   - the selected language is non-Latin (small Whisper models romanize it), OR
    //   - we're on the free stack (its local Whisper `base` model is weak at and
    //     mis-detects non-English speech).
    if ((isNonLatinLang(safeLang) || isFreeVoiceStack()) && geminiKey) {
      geminiAttempted = true;
      const g = await transcribeWithGemini(geminiKey, audioBuffer, baseMime, safeLang);
      if (g.text) return NextResponse.json({ text: g.text, provider: "gemini" });
      console.warn("[STT] Gemini (auto-detect first) failed:", g.error ?? "empty");
    }

    // Free / college stack: Whisper HTTP first (skip local CLI when not configured)
    if (isFreeVoiceStack()) {
      if (shouldUseWhisperHttpServer()) {
        const serverResult = await transcribeWithWhisperServer(
          new Blob([audioBuffer], { type: baseMime }),
          safeLang
        );
        const text = acceptTranscription(serverResult.text, safeLang);
        if (text) {
          return NextResponse.json({ text, provider: "whisper-server" });
        }
      }

      if (process.env.WHISPER_MODEL_PATH?.trim()) {
        const localResult = await transcribeWithLocalWhisper(audioBuffer);
        const text = acceptTranscription(localResult.text, safeLang);
        if (text) {
          return NextResponse.json({ text, provider: "whisper-local" });
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
        const nemotronText = acceptTranscription(nemotronResult.text, safeLang);
        if (nemotronText) {
          return NextResponse.json({ text: nemotronText, provider: "nemotron-asr" });
        }
        nemotronError = nemotronResult.error;
        console.warn("[STT] Nemotron ASR did not return text:", nemotronError ?? "empty");
      }

      if (shouldUseWhisperHttpServer()) {
        const serverResult = await transcribeWithWhisperServer(
          new Blob([audioBuffer], { type: baseMime }),
          safeLang
        );
        const text = acceptTranscription(serverResult.text, safeLang);
        if (text) {
          return NextResponse.json({ text, provider: "whisper-server" });
        }
      }

      const localResult = await transcribeWithLocalWhisper(audioBuffer);
      const cloudLocalText = acceptTranscription(localResult.text, safeLang);
      if (cloudLocalText) {
        return NextResponse.json({ text: cloudLocalText, provider: "whisper-local" });
      }
    }

    // OpenAI Whisper (cloud stack): preferred over Gemini multimodal for a
    // smoother, more accurate transcription before the last-resort fallback.
    if (!isFreeVoiceStack() && isOpenAiWhisperConfigured()) {
      const whisperResult = await transcribeWithOpenAiWhisper(
        new Blob([audioBuffer], { type: baseMime }),
        baseMime,
        safeLang
      );
      const whisperText = acceptTranscription(whisperResult.text, safeLang);
      if (whisperText) {
        return NextResponse.json({ text: whisperText, provider: "openai-whisper" });
      }
      console.warn("[STT] OpenAI Whisper did not return text:", whisperResult.error ?? "empty");
    }

    // Gemini fallback (Latin languages, or non-Latin if the script-first attempt
    // above failed — `geminiAttempted` avoids calling it twice).
    if (geminiKey && !geminiAttempted) {
      const g = await transcribeWithGemini(geminiKey, audioBuffer, baseMime, safeLang);
      if (g.text) return NextResponse.json({ text: g.text, provider: "gemini" });
    }

    // Nothing produced a usable transcription.
    if (!geminiKey) {
      const localTry = await transcribeWithLocalWhisper(audioBuffer);
      const serverTry = shouldUseWhisperHttpServer()
        ? await transcribeWithWhisperServer(new Blob([audioBuffer], { type: baseMime }), safeLang)
        : { error: "Whisper server not configured" };
      const err = serverTry.error || localTry.error || "STT unavailable";
      return NextResponse.json({ error: err }, { status: 502 });
    }
    return NextResponse.json(
      { error: "No speech detected. Please try again.", fallbackNative: true },
      { status: 422 }
    );

  } catch (error) {
    console.error('STT API Error:', error);
    const mapped = mapGeminiApiError(error);
    const headers: Record<string, string> = {};
    if (mapped.status === 429) headers["Retry-After"] = "60";
    return NextResponse.json({ error: mapped.error }, { status: mapped.status, headers });
  }
}
