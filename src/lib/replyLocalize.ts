/**
 * Localize deterministic service-flow replies (booking / dining / availability
 * confirmations) into the guest's selected language.
 *
 * The booking/dining flows emit hardcoded English template strings that bypass
 * the LLM, so they were always shown in English even when the guest had picked
 * Nepali (or any other language). This translates those replies via the active
 * provider, preserving dates, prices, numbers and proper nouns. On any failure
 * it returns the original text so a translation hiccup never blocks a booking.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { getActiveAiProvider } from "@/lib/ai";
import { getGeminiApiKey } from "@/lib/gemini";
import { getOpenAiApiKey } from "@/lib/openai";
import { GEMINI_MODEL } from "@/lib/geminiModel";
import { getLanguageByCode } from "@/lib/languages";

/** English target language name for a BCP-47 code, or null if English/unknown. */
function targetLanguageName(langCode?: string): string | null {
  if (!langCode || langCode.toLowerCase().startsWith("en")) return null;
  return getLanguageByCode(langCode)?.name ?? null;
}

function translationPrompt(text: string, languageName: string): string {
  return (
    `Translate the following hotel concierge message into ${languageName}. ` +
    `Preserve all dates, times, prices, currency codes, numbers, room names, ` +
    `and other proper nouns exactly as written. Keep it natural and concise. ` +
    `Output ONLY the translated message — no quotes, no notes, no romanization.\n\n` +
    `MESSAGE:\n${text}`
  );
}

let genAi: GoogleGenerativeAI | null = null;
let openai: OpenAI | null = null;

/**
 * Translate a service-flow reply into the guest's language. Returns the text
 * unchanged when the language is English/unknown or when translation fails.
 */
export async function localizeServiceReply(text: string, langCode?: string): Promise<string> {
  const name = targetLanguageName(langCode);
  if (!name || !text.trim()) return text;

  try {
    const provider = getActiveAiProvider();
    if (provider === "openai") {
      if (!openai) openai = new OpenAI({ apiKey: getOpenAiApiKey() });
      const res = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 400,
        messages: [{ role: "user", content: translationPrompt(text, name) }],
      });
      return res.choices[0]?.message?.content?.trim() || text;
    }

    if (!genAi) genAi = new GoogleGenerativeAI(getGeminiApiKey() || "");
    const model = genAi.getGenerativeModel({ model: GEMINI_MODEL });
    const res = await model.generateContent(translationPrompt(text, name));
    return res.response.text().trim() || text;
  } catch (err) {
    console.warn("[i18n] Service reply translation failed:", err);
    return text;
  }
}
