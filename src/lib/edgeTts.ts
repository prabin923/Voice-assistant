/**
 * Microsoft Edge online TTS — free server-side fallback (no API key).
 */

import { EdgeTTS } from "edge-tts-universal";
import { sanitizeForSpeech } from "@/lib/humanizeSpeech";
import type { NemotronVoicePersona } from "@/lib/nemotronVoice";

const VOICE_BY_LANG: Record<string, Record<NemotronVoicePersona, string>> = {
  // ── English ──────────────────────────────────────────────────────────────
  "en-US": { warm: "en-US-AriaNeural",      professional: "en-US-GuyNeural",       energetic: "en-US-JennyNeural" },
  "en-GB": { warm: "en-GB-SoniaNeural",     professional: "en-GB-RyanNeural",      energetic: "en-GB-LibbyNeural" },
  // ── European ─────────────────────────────────────────────────────────────
  "fr-FR": { warm: "fr-FR-DeniseNeural",    professional: "fr-FR-HenriNeural",     energetic: "fr-FR-EloiseNeural" },
  "de-DE": { warm: "de-DE-KatjaNeural",     professional: "de-DE-ConradNeural",    energetic: "de-DE-AmalaNeural" },
  "es-ES": { warm: "es-ES-ElviraNeural",    professional: "es-ES-AlvaroNeural",    energetic: "es-ES-XimenaNeural" },
  "it-IT": { warm: "it-IT-ElsaNeural",      professional: "it-IT-DiegoNeural",     energetic: "it-IT-IsabellaNeural" },
  "pt-BR": { warm: "pt-BR-FranciscaNeural", professional: "pt-BR-AntonioNeural",   energetic: "pt-BR-FranciscaNeural" },
  "pt-PT": { warm: "pt-PT-RaquelNeural",    professional: "pt-PT-DuarteNeural",    energetic: "pt-PT-RaquelNeural" },
  "nl-NL": { warm: "nl-NL-ColetteNeural",   professional: "nl-NL-MaartenNeural",   energetic: "nl-NL-FennaNeural" },
  "pl-PL": { warm: "pl-PL-ZofiaNeural",     professional: "pl-PL-MarekNeural",     energetic: "pl-PL-ZofiaNeural" },
  "ru-RU": { warm: "ru-RU-SvetlanaNeural",  professional: "ru-RU-DmitryNeural",    energetic: "ru-RU-SvetlanaNeural" },
  "tr-TR": { warm: "tr-TR-EmelNeural",      professional: "tr-TR-AhmetNeural",     energetic: "tr-TR-EmelNeural" },
  "sv-SE": { warm: "sv-SE-SofieNeural",     professional: "sv-SE-MattiasNeural",   energetic: "sv-SE-HilleviNeural" },
  "da-DK": { warm: "da-DK-ChristelNeural",  professional: "da-DK-JeppeNeural",     energetic: "da-DK-ChristelNeural" },
  "fi-FI": { warm: "fi-FI-NooraNeural",     professional: "fi-FI-HarriNeural",     energetic: "fi-FI-NooraNeural" },
  "nb-NO": { warm: "nb-NO-PernilleNeural",  professional: "nb-NO-FinnNeural",      energetic: "nb-NO-IselinNeural" },
  "no-NO": { warm: "nb-NO-PernilleNeural",  professional: "nb-NO-FinnNeural",      energetic: "nb-NO-IselinNeural" },
  "cs-CZ": { warm: "cs-CZ-VlastaNeural",    professional: "cs-CZ-AntoninNeural",   energetic: "cs-CZ-VlastaNeural" },
  "ro-RO": { warm: "ro-RO-AlinaNeural",     professional: "ro-RO-EmilNeural",      energetic: "ro-RO-AlinaNeural" },
  "el-GR": { warm: "el-GR-AthinaNeural",    professional: "el-GR-NestorasNeural",  energetic: "el-GR-AthinaNeural" },
  "he-IL": { warm: "he-IL-HilaNeural",      professional: "he-IL-AvriNeural",      energetic: "he-IL-HilaNeural" },
  "uk-UA": { warm: "uk-UA-PolinaNeural",    professional: "uk-UA-OstapNeural",     energetic: "uk-UA-PolinaNeural" },
  "bg-BG": { warm: "bg-BG-KalinaNeural",    professional: "bg-BG-BorislavNeural",  energetic: "bg-BG-KalinaNeural" },
  "hr-HR": { warm: "hr-HR-GabrijelaNeural", professional: "hr-HR-SreckoNeural",    energetic: "hr-HR-GabrijelaNeural" },
  "et-EE": { warm: "et-EE-AnuNeural",       professional: "et-EE-KertNeural",      energetic: "et-EE-AnuNeural" },
  "hu-HU": { warm: "hu-HU-NoemiNeural",     professional: "hu-HU-TamasNeural",     energetic: "hu-HU-NoemiNeural" },
  "lt-LT": { warm: "lt-LT-OnaNeural",       professional: "lt-LT-LeonasNeural",    energetic: "lt-LT-OnaNeural" },
  // ── Asian ─────────────────────────────────────────────────────────────────
  "ja-JP": { warm: "ja-JP-NanamiNeural",    professional: "ja-JP-KeitaNeural",     energetic: "ja-JP-AoiNeural" },
  "zh-CN": { warm: "zh-CN-XiaoxiaoNeural",  professional: "zh-CN-YunxiNeural",     energetic: "zh-CN-XiaoyiNeural" },
  "zh-TW": { warm: "zh-TW-HsiaoChenNeural", professional: "zh-TW-YunJheNeural",    energetic: "zh-TW-HsiaoYuNeural" },
  "ko-KR": { warm: "ko-KR-SunHiNeural",     professional: "ko-KR-InJoonNeural",    energetic: "ko-KR-BongJinNeural" },
  "th-TH": { warm: "th-TH-PremwadeeNeural", professional: "th-TH-NiwatNeural",     energetic: "th-TH-AcharaNeural" },
  "vi-VN": { warm: "vi-VN-HoaiMyNeural",    professional: "vi-VN-NamMinhNeural",   energetic: "vi-VN-HoaiMyNeural" },
  "id-ID": { warm: "id-ID-GadisNeural",     professional: "id-ID-ArdiNeural",      energetic: "id-ID-GadisNeural" },
  "ms-MY": { warm: "ms-MY-YasminNeural",    professional: "ms-MY-OsmanNeural",     energetic: "ms-MY-YasminNeural" },
  "fil-PH": { warm: "fil-PH-BlessicaNeural",professional: "fil-PH-AngeloNeural",   energetic: "fil-PH-BlessicaNeural" },
  // ── South Asian ───────────────────────────────────────────────────────────
  "hi-IN": { warm: "hi-IN-SwaraNeural",     professional: "hi-IN-MadhurNeural",    energetic: "hi-IN-SwaraNeural" },
  "ne-NP": { warm: "ne-NP-HemkalaNeural",   professional: "ne-NP-SagarNeural",     energetic: "ne-NP-HemkalaNeural" },
  "bn-BD": { warm: "bn-BD-NabanitaNeural",  professional: "bn-BD-PradeepNeural",   energetic: "bn-BD-NabanitaNeural" },
  "ta-IN": { warm: "ta-IN-PallaviNeural",   professional: "ta-IN-ValluvarNeural",  energetic: "ta-IN-PallaviNeural" },
  "te-IN": { warm: "te-IN-ShrutiNeural",    professional: "te-IN-MohanNeural",     energetic: "te-IN-ShrutiNeural" },
  // ── Middle East & Africa ──────────────────────────────────────────────────
  "ar-SA": { warm: "ar-SA-ZariyahNeural",   professional: "ar-SA-HamedNeural",     energetic: "ar-SA-ZariyahNeural" },
  "sw-KE": { warm: "sw-KE-ZuriNeural",      professional: "sw-KE-RafikiNeural",    energetic: "sw-KE-ZuriNeural" },
};

function normalizeLanguage(language?: string): string {
  const raw = (language || "en-US").trim();
  if (!raw) return "en-US";
  const parts = raw.split("-");
  if (parts.length === 1) return parts[0].toLowerCase();
  return `${parts[0].toLowerCase()}-${parts[1].toUpperCase()}`;
}

export function resolveEdgeProsody(
  voiceStyle: NemotronVoicePersona = "warm"
): { rate: string; pitch: string; volume: string } {
  switch (voiceStyle) {
    case "professional":
      return { rate: "+2%", pitch: "-4Hz", volume: "+0%" };
    case "energetic":
      return { rate: "+10%", pitch: "+6Hz", volume: "+4%" };
    default:
      return { rate: "+4%", pitch: "+2Hz", volume: "+0%" };
  }
}

export function resolveEdgeVoice(
  language?: string,
  voiceStyle: NemotronVoicePersona = "warm"
): string {
  const normalized = normalizeLanguage(language);

  // EDGE_TTS_VOICE pins a voice — but only honor it when it matches the
  // requested language, otherwise it forces one voice (e.g. English) onto every
  // language and the assistant can't speak Nepali/Hindi/etc.
  const override = process.env.EDGE_TTS_VOICE?.trim();
  if (override) {
    const overrideLocale = override.split("-").slice(0, 2).join("-"); // "ne-NP-Hemkala…" -> "ne-NP"
    const sameLocale = overrideLocale.toLowerCase() === normalized.toLowerCase();
    const samePrimary =
      overrideLocale.split("-")[0].toLowerCase() === normalized.split("-")[0].toLowerCase();
    if (sameLocale || samePrimary) return override;
  }

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
  const prosody = resolveEdgeProsody(options.voiceStyle ?? "warm");

  try {
    const tts = new EdgeTTS(text, voice, prosody);
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
