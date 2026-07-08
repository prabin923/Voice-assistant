/**
 * Pure lexical + ranking helpers for RAG retrieval.
 *
 * Kept free of Prisma/embedding imports so it can be unit-tested in isolation
 * and so the tokenizer's multilingual behaviour (Nepali, Hindi, Arabic, CJK,
 * etc.) is verifiable without a database or embedding API.
 */

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
  return query
    .toLowerCase()
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
 * Cross-lingual cosine similarities (e.g. a Nepali query against English
 * knowledge) run lower than same-language ones. Relax the acceptance threshold
 * for non-Latin queries so genuine matches aren't discarded into the
 * metadata-only fallback.
 */
export function adaptiveMinScore(query: string, baseMinScore: number): number {
  return hasNonLatinScript(query) ? Math.min(baseMinScore, 0.2) : baseMinScore;
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
