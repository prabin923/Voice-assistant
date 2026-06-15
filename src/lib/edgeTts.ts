/**
 * Microsoft Edge online TTS — free server-side fallback (no API key).
 */

import { EdgeTTS } from "edge-tts-universal";
import { sanitizeForSpeech } from "@/lib/humanizeSpeech";
import type { NemotronVoicePersona } from "@/lib/nemotronVoice";

const VOICE_BY_LANG: Record<string, Record<NemotronVoicePersona, string>> = {
  "en-US": {
    warm: "en-US-AriaNeural",
    professional: "en-US-GuyNeural",
    energetic: "en-US-JennyNeural",
  },
  "en-GB": {
    warm: "en-GB-SoniaNeural",
    professional: "en-GB-RyanNeural",
    energetic: "en-GB-LibbyNeural",
  },
  "fr-FR": {
    warm: "fr-FR-DeniseNeural",
    professional: "fr-FR-HenriNeural",
    energetic: "fr-FR-EloiseNeural",
  },
  "de-DE": {
    warm: "de-DE-KatjaNeural",
    professional: "de-DE-ConradNeural",
    energetic: "de-DE-AmalaNeural",
  },
  "es-ES": {
    warm: "es-ES-ElviraNeural",
    professional: "es-ES-AlvaroNeural",
    energetic: "es-ES-XimenaNeural",
  },
  "hi-IN": {
    warm: "hi-IN-SwaraNeural",
    professional: "hi-IN-MadhurNeural",
    energetic: "hi-IN-SwaraNeural",
  },
  "ja-JP": {
    warm: "ja-JP-NanamiNeural",
    professional: "ja-JP-KeitaNeural",
    energetic: "ja-JP-NanamiNeural",
  },
  "zh-CN": {
    warm: "zh-CN-XiaoxiaoNeural",
    professional: "zh-CN-YunxiNeural",
    energetic: "zh-CN-XiaoyiNeural",
  },
};

function normalizeLanguage(language?: string): string {
  const raw = (language || "en-US").trim();
  if (!raw) return "en-US";
  const parts = raw.split("-");
  if (parts.length === 1) return parts[0].toLowerCase();
  return `${parts[0].toLowerCase()}-${parts[1].toUpperCase()}`;
}

export function resolveEdgeVoice(
  language?: string,
  voiceStyle: NemotronVoicePersona = "warm"
): string {
  const override = process.env.EDGE_TTS_VOICE?.trim();
  if (override) return override;

  const normalized = normalizeLanguage(language);
  if (VOICE_BY_LANG[normalized]) {
    return VOICE_BY_LANG[normalized][voiceStyle];
  }

  const langPrimary = normalized.split("-")[0];
  for (const [locale, voices] of Object.entries(VOICE_BY_LANG)) {
    if (locale.startsWith(`${langPrimary}-`)) {
      return voices[voiceStyle];
    }
  }

  return VOICE_BY_LANG["en-US"][voiceStyle];
}

export function isEdgeTtsAvailable(): boolean {
  return typeof window === "undefined";
}

export async function synthesizeWithEdgeTts(options: {
  text: string;
  language?: string;
  voiceStyle?: NemotronVoicePersona;
}): Promise<{ audio?: Buffer; error?: string; contentType?: string }> {
  if (!isEdgeTtsAvailable()) {
    return { error: "Edge TTS is server-only" };
  }

  const text = sanitizeForSpeech(options.text);
  if (!text) return { error: "No text to synthesize" };

  const voice = resolveEdgeVoice(options.language, options.voiceStyle ?? "warm");

  try {
    const tts = new EdgeTTS(text, voice);
    const result = await tts.synthesize();
    const audio = Buffer.from(await result.audio.arrayBuffer());
    return audio.length > 0
      ? { audio, contentType: result.audio.type || "audio/mpeg" }
      : { error: "Empty audio response" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Edge TTS failed";
    return { error: message };
  }
}
