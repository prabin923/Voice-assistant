/**
 * Pure lexical + ranking helpers for RAG retrieval.
 *
 * Kept free of Prisma/embedding imports so it can be unit-tested in isolation
 * and so the tokenizer's multilingual behaviour (Arabic, CJK, Devanagari,
 * etc.) is verifiable without a database or embedding API.
 */

import {
  getKeywordsForLanguage,
  isEnglishLanguageCode,
  resolveSupportedLanguageCode,
  type IntentKey,
} from "@/lib/languages";

export type ScorableChunk = {
  chunkKey: string;
  category: string;
  title: string;
  content: string;
};

export type ScoredChunk = ScorableChunk & { score: number };

// English function words only - applied to ASCII tokens. Non-Latin tokens are
// never dropped as stop words (we don't carry stop lists for every language).
const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "do", "you", "have", "what", "when", "where", "how",
  "can", "i", "we", "my", "your", "about", "for", "and", "or", "to", "at", "in", "on",
]);

const ASCII_WORD = /^[a-z0-9]+$/;

const RETRIEVAL_INTENT_TERMS: Partial<Record<IntentKey, string>> = {
  booking: "room reservations availability and stay dates",
  room_info: "room types room features beds and guest capacity",
  pricing: "room prices rates and charges",
  checkin: "check-in arrival and early check-in policy",
  checkout: "check-out departure and late checkout policy",
  dining: "hotel dining restaurant meals menu and opening hours",
  amenities: "hotel amenities facilities wifi pool gym spa and parking",
  policies: "hotel policies cancellation pets smoking children and extra beds",
  contact: "hotel contact address directions phone email and location",
  shuttle: "airport pickup shuttle transport and parking",
  laundry: "laundry cleaning and guest services",
};

function normalizedText(text: string): string {
  return text.normalize("NFKC").toLocaleLowerCase();
}

/** True if the text contains any non-Latin letter (Devanagari, Arabic, CJK, ...). */
export function hasNonLatinScript(text: string): boolean {
  // Any character that is a letter (\p{L}) but not Latin script.
  return /[^\p{Script=Latin}\P{L}]/u.test(text);
}

/**
 * Unicode-aware tokenizer. Splits on anything that is not a letter or number in
 * ANY script, so a Nepali query tokenizes into real words instead of [] (the
 * old /[^a-z0-9]+/ split discarded every non-Latin script entirely).
 */
export function queryTokens(query: string): string[] {
  return normalizedText(query)
    .split(/[^\p{L}\p{N}]+/gu)
    .filter((w) => {
      if (!w) return false;
      if (ASCII_WORD.test(w)) {
        // Latin/ASCII: keep the original 3-char minimum + English stop-word filter.
        return w.length > 2 && !STOP_WORDS.has(w);
      }
      // Non-Latin scripts: a single ideograph or a short Devanagari word is
      // meaningful, so keep anything with at least one character.
      return w.length >= 1;
    });
}

/**
 * Keep the guest's original words for multilingual embeddings, then append a
 * small English intent anchor when we recognize a supported language. Hotel
 * knowledge is often authored in English, so this gives semantic and lexical
 * search a stable cross-language bridge without translating or discarding the
 * guest's query.
 */
export function enrichMultilingualRetrievalQuery(query: string, langCode?: string): string {
  const trimmed = query.trim();
  if (!trimmed) return "";

  const language = resolveSupportedLanguageCode(langCode) ?? langCode ?? "en-US";
  const haystack = normalizedText(trimmed);
  const topics = Object.entries(getKeywordsForLanguage(language))
    .flatMap(([intent, keywords]) => {
      const term = RETRIEVAL_INTENT_TERMS[intent as IntentKey];
      if (!term) return [];
      return keywords.some((keyword) => haystack.includes(normalizedText(keyword))) ? [term] : [];
    });
  const uniqueTopics = [...new Set(topics)];

  return uniqueTopics.length
    ? `${trimmed}\nHotel knowledge topics: ${uniqueTopics.join("; ")}`
    : trimmed;
}

/** True when voice retrieval must wait for multilingual semantic search. */
export function requiresMultilingualSemanticSearch(query: string, langCode?: string): boolean {
  return hasNonLatinScript(query) || Boolean(langCode?.trim() && !isEnglishLanguageCode(langCode));
}

/** Fast keyword overlap - skips the embedding API on obvious matches. */
export function lexicalRetrieve(
  rows: ScorableChunk[],
  query: string,
  topK: number,
  minScore = 0.34
): ScoredChunk[] {
  const tokens = queryTokens(query);
  if (!tokens.length) return [];

  return rows
    .map((row) => {
      const haystack = `${row.title} ${row.content}`.toLowerCase();
      let hits = 0;
      for (const token of tokens) {
        if (haystack.includes(token)) hits++;
      }
      return { ...row, score: hits / tokens.length };
    })
    .filter((row) => row.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export function isStrongLexicalMatch(chunks: ScoredChunk[]): boolean {
  return chunks.length >= 2 && (chunks[0]?.score ?? 0) >= 0.5;
}

/**
 * Cross-lingual cosine similarities often run lower than same-language ones.
 * Relax the acceptance threshold for every supported non-English language, not
 * only languages written in a non-Latin script.
 */
export function adaptiveMinScore(query: string, baseMinScore: number, langCode?: string): number {
  return requiresMultilingualSemanticSearch(query, langCode)
    ? Math.min(baseMinScore, 0.2)
    : baseMinScore;
}

/**
 * Hybrid ranking preserves exact in-language matches while semantic retrieval
 * handles a guest asking in a different language than the source knowledge.
 */
export function mergeSemanticAndLexical(
  semantic: ScoredChunk[],
  lexical: ScoredChunk[],
  topK: number
): ScoredChunk[] {
  const semanticByKey = new Map(semantic.map((chunk) => [chunk.chunkKey, chunk]));
  const lexicalByKey = new Map(lexical.map((chunk) => [chunk.chunkKey, chunk]));
  const keys = new Set([...semanticByKey.keys(), ...lexicalByKey.keys()]);

  return [...keys]
    .map((chunkKey) => {
      const semanticChunk = semanticByKey.get(chunkKey);
      const lexicalChunk = lexicalByKey.get(chunkKey);
      const chunk = semanticChunk ?? lexicalChunk!;
      const semanticScore = semanticChunk?.score ?? 0;
      const lexicalScore = lexicalChunk?.score ?? 0;

      return {
        ...chunk,
        score:
          Math.max(semanticScore, lexicalScore * 0.55) +
          (semanticScore > 0 && lexicalScore > 0 ? Math.min(semanticScore, lexicalScore) * 0.1 : 0),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/**
 * Select chunks from already-scored candidates.
 *
 * Returns everything at/above `minScore`. If nothing clears the bar but real
 * candidates exist above `floor`, returns the single best one anyway (a "soft
 * floor") so the model is grounded on the most relevant REAL knowledge instead
 * of falling back to bare hotel metadata. The grounding instruction still lets
 * the model decline if that best chunk doesn't actually answer the question.
 */
export function selectByScore(
  scored: ScoredChunk[],
  opts: { minScore: number; floor: number; topK: number }
): ScoredChunk[] {
  const ranked = [...scored].sort((a, b) => b.score - a.score);
  const above = ranked.filter((r) => r.score >= opts.minScore).slice(0, opts.topK);
  if (above.length > 0) return above;

  const best = ranked[0];
  if (best && best.score >= opts.floor) return [best];
  return [];
}
