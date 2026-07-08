import type { HotelConfig } from "@/lib/hotelConfig";
import {
  buildRetrievalQuery,
  ragTimeoutMs,
  retrieveRelevantChunks,
  type RetrievedChunk,
} from "@/lib/rag/knowledgeIndex";
import { hasNonLatinScript } from "@/lib/rag/lexical";

export type ChatTurn = { role: string; content: string };

/** Serialize hotel config for LLM context (full or compact). */
export function buildHotelDataBlock(config: HotelConfig, compact: boolean): string {
  if (compact) {
    return `- ${config.branding.hotelName}, ${config.contact.city}
- Phone: ${config.contact.phone}
- Check-in ${config.policies.checkInTime}, check-out ${config.policies.checkOutTime}
- Rooms: ${config.rooms.map((r) => `${r.name} ${r.currency}${r.pricePerNight}/night`).join("; ")}
- Amenities: ${config.amenities.map((a) => a.name).join(", ")}
- Dining: ${config.dining.map((d) => d.name).join(", ") || "see FAQ"}`;
  }

  const diningBlock =
    config.dining?.length > 0
      ? config.dining.map((d) => `${d.name} (${d.cuisine}): ${d.hours}`).join("; ")
      : "None configured.";
  const faqBlock =
    config.customFAQ?.length > 0
      ? config.customFAQ.map((f) => `${f.question} → ${f.answer}`).join("; ")
      : "None configured.";

  return `- Hotel: ${config.branding.hotelName}, ${config.contact.address}, ${config.contact.city}
- Phone: ${config.contact.phone}, Email: ${config.contact.email}
- Check-in/out: ${config.policies.checkInTime} / ${config.policies.checkOutTime}
- Cancellation: ${config.policies.cancellationPolicy}
- Pets: ${config.policies.petPolicy}
- Smoking: ${config.policies.smokingPolicy}
- Children: ${config.policies.childPolicy}
- Amenities: ${config.amenities.map((a) => `${a.name}${a.hours ? ` (${a.hours})` : ""}`).join("; ")}
- Dining: ${diningBlock}
- FAQ: ${faqBlock}
- Rooms: ${config.rooms
    .map(
      (r) =>
        `${r.name}: ${r.currency}${r.pricePerNight}/night, max ${r.maxOccupancy} — ${r.description}`,
    )
    .join("; ")}`;
}

// BCP-47 → readable name (English variants intentionally absent — no instruction needed)
const LANG_NAMES: Record<string, string> = {
  "ar-SA": "Arabic",          "bn-BD": "Bengali",        "bg-BG": "Bulgarian",
  "zh-CN": "Chinese",         "zh-TW": "Chinese (Traditional)", "hr-HR": "Croatian",
  "cs-CZ": "Czech",           "da-DK": "Danish",         "nl-NL": "Dutch",
  "et-EE": "Estonian",        "fi-FI": "Finnish",        "fr-FR": "French",
  "de-DE": "German",          "el-GR": "Greek",          "he-IL": "Hebrew",
  "hi-IN": "Hindi",           "hu-HU": "Hungarian",      "id-ID": "Indonesian",
  "it-IT": "Italian",         "ja-JP": "Japanese",       "ko-KR": "Korean",
  "lt-LT": "Lithuanian",      "ms-MY": "Malay",          "ne-NP": "Nepali",
  "no-NO": "Norwegian",       "pl-PL": "Polish",         "pt-BR": "Portuguese",
  "ro-RO": "Romanian",        "ru-RU": "Russian",        "es-ES": "Spanish",
  "sw-KE": "Swahili",         "sv-SE": "Swedish",        "ta-IN": "Tamil",
  "te-IN": "Telugu",          "th-TH": "Thai",           "tr-TR": "Turkish",
  "uk-UA": "Ukrainian",       "vi-VN": "Vietnamese",     "fil-PH": "Filipino",
};

/** Grounding footnote appended to every context block. */
function groundingFootnote(phone: string): string {
  return `\nONLY answer from the HOTEL FACTS above. If the answer is not listed, say: "I don't have that detail — our front desk can help at ${phone}."`;
}

/**
 * Language instruction: mirror the language the guest is actually writing in —
 * including romanized/transliterated languages (e.g. Nepali/Hindi typed in Latin
 * letters) — rather than rigidly following the widget's language selector.
 */
function langLine(langCode?: string): string {
  const widget = (langCode && LANG_NAMES[langCode]) || "English";
  return `\nReply in the SAME language the guest is writing in, including romanized/transliterated languages: if they type Nepali or Hindi in Latin letters (e.g. "kun kun room available xa"), understand it and reply in that language using its native script. Only default to ${widget} if the guest's language is genuinely unclear.`;
}

function fullContextMessage(
  config: HotelConfig,
  message: string,
  channel: "voice" | "text",
  langCode?: string
) {
  const fullData = buildHotelDataBlock(config, channel === "voice");
  return {
    usedRag: false,
    message: `HOTEL DATA:\n${fullData}${langLine(langCode)}${groundingFootnote(config.contact.phone)}\n\nGUEST MESSAGE:\n${message}`,
  };
}

function fastVoiceFallbackMessage(
  config: HotelConfig,
  message: string,
  langCode?: string
) {
  const concise = [
    `- ${config.branding.hotelName} | ${config.contact.phone} | ${config.contact.city}`,
    `- Check-in ${config.policies.checkInTime}, check-out ${config.policies.checkOutTime}`,
    `- Rooms: ${config.rooms.slice(0, 3).map((r) => `${r.name} ${r.currency}${r.pricePerNight}`).join("; ")}`,
    `- Dining: ${config.dining.slice(0, 3).map((d) => d.name).join(", ") || "not listed"}`,
    // Include real knowledge (amenities + FAQ), not just metadata, so the
    // fallback can still answer "do you have X?" instead of guessing.
    `- Amenities: ${config.amenities.map((a) => `${a.name}${a.hours ? ` (${a.hours})` : ""}`).join("; ") || "not listed"}`,
    config.customFAQ?.length
      ? `- FAQ: ${config.customFAQ.slice(0, 4).map((f) => `${f.question} → ${f.answer}`).join("; ")}`
      : "",
  ].filter(Boolean).join("\n");
  return {
    usedRag: false,
    message:
      `HOTEL FACTS:\n${concise}${langLine(langCode)}${groundingFootnote(config.contact.phone)}` +
      "\nVOICE MODE: Answer in 1-2 short conversational sentences." +
      `\n\nGUEST MESSAGE:\n${message}`,
  };
}

export async function augmentUserMessageWithHotelContext(
  message: string,
  history: ChatTurn[],
  config: HotelConfig,
  channel: "voice" | "text",
  langCode?: string
): Promise<{ message: string; usedRag: boolean }> {
  try {
    const topK = channel === "voice" ? 3 : 10;
    const query = buildRetrievalQuery(message, history);

    // Non-Latin (e.g. Nepali) queries can't use the lexical fast path against an
    // English knowledge base, so they MUST embed — give them the longer text
    // budget instead of the 180ms voice budget, or they always time out into the
    // metadata-only fallback.
    const timeoutMs =
      channel === "voice" && hasNonLatinScript(query)
        ? ragTimeoutMs("text")
        : ragTimeoutMs(channel);

    const chunks = await Promise.race([
      retrieveRelevantChunks(query, {
        topK,
        minScore: channel === "voice" ? 0.28 : 0.32,
        // Voice: prefer fast keyword match first; fall back to semantic only
        // when nothing strong is found (covers website prose chunks too).
        preferFastLexical: channel === "voice",
        lexicalOnly: false,
      }),
      new Promise<RetrievedChunk[]>((resolve) =>
        setTimeout(() => resolve([]), timeoutMs)
      ),
    ]);

    if (chunks.length > 0) {
      const dialogue = chunks.filter((c) => c.category === "dialogue");
      const factual  = chunks.filter((c) => c.category !== "dialogue");

      // Voice: prioritise dialogue examples for natural tone
      const selected =
        channel === "voice" && dialogue.length > 0
          ? [...dialogue.slice(0, 2), ...factual.slice(0, Math.max(topK - 2, 2))]
          : chunks;

      const core = `- ${config.branding.hotelName} | ${config.contact.phone} | ${config.contact.city}`;
      const facts = [core, ...selected.map((c) => `- ${c.title}: ${c.content}`)].join("\n");

      const voiceHint =
        channel === "voice"
          ? dialogue.length > 0
            ? "\nVOICE MODE: Match the natural tone of the DIALOGUE EXAMPLES above. Answer in 1–2 warm spoken sentences — concise, human, never a brochure."
            : "\nVOICE MODE: Answer in 1–2 spoken sentences. Warm and human — not a brochure."
          : dialogue.length > 0
            ? "\nMatch the conversational tone of the DIALOGUE EXAMPLES when helpful."
            : "";

      return {
        usedRag: true,
        message: `HOTEL FACTS:\n${facts}${langLine(langCode)}${groundingFootnote(config.contact.phone)}${voiceHint}\n\nGUEST MESSAGE:\n${message}`,
      };
    }
  } catch (err) {
    console.warn("[RAG] Augment failed, using full hotel data:", err);
  }

  if (channel === "voice") {
    return fastVoiceFallbackMessage(config, message, langCode);
  }
  return fullContextMessage(config, message, channel, langCode);
}
