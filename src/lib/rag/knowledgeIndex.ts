import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import type { HotelConfig } from "@/lib/hotelConfig";
import { ensureDbReady } from "@/lib/db";
import { chunkHotelConfig } from "@/lib/rag/chunkHotelConfig";
import { activeEmbedModel, contentHash, embedQuery, embedTexts } from "@/lib/rag/embeddings";
import { cosineSimilarity } from "@/lib/rag/similarity";

export type RetrievedChunk = {
  chunkKey: string;
  category: string;
  title: string;
  content: string;
  score: number;
};

type IndexedChunk = {
  chunkKey: string;
  category: string;
  title: string;
  content: string;
  vector: number[];
};

const EMBED_BATCH = 12;
const CHUNK_INDEX_TTL_MS = 120_000;
const RAG_TIMEOUT_MS_VOICE = 180;
const RAG_TIMEOUT_MS_TEXT = 700;

let syncPromise: Promise<void> | null = null;
let chunkIndexCache: { rows: IndexedChunk[]; loadedAt: number } | null = null;

function embeddingText(chunk: { title: string; content: string }): string {
  return `${chunk.title}\n${chunk.content}`;
}

export function invalidateChunkIndexCache(): void {
  chunkIndexCache = null;
}

async function loadIndexedChunks(): Promise<IndexedChunk[]> {
  if (chunkIndexCache && Date.now() - chunkIndexCache.loadedAt < CHUNK_INDEX_TTL_MS) {
    return chunkIndexCache.rows;
  }

  try {
    await ensureDbReady();
    const rows = await prisma.knowledgeChunk.findMany({
      select: {
        chunkKey: true,
        category: true,
        title: true,
        content: true,
        embedding: true,
      },
    });

    const indexed: IndexedChunk[] = [];
    for (const row of rows) {
      try {
        const vector = JSON.parse(row.embedding) as number[];
        if (!vector?.length) continue;
        indexed.push({
          chunkKey: row.chunkKey,
          category: row.category,
          title: row.title,
          content: row.content,
          vector,
        });
      } catch {
        /* skip bad row */
      }
    }

    chunkIndexCache = { rows: indexed, loadedAt: Date.now() };
    return indexed;
  } catch (err) {
    if (!isMissingTableError(err)) {
      console.warn("[RAG] Chunk index load failed:", err);
    }
    return [];
  }
}

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "do", "you", "have", "what", "when", "where", "how",
  "can", "i", "we", "my", "your", "about", "for", "and", "or", "to", "at", "in", "on",
]);

function queryTokens(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/** Fast keyword overlap — skips embedding API on obvious matches (voice latency). */
function lexicalRetrieve(rows: IndexedChunk[], query: string, topK: number): RetrievedChunk[] {
  const tokens = queryTokens(query);
  if (!tokens.length) return [];

  const scored = rows
    .map((row) => {
      const haystack = `${row.title} ${row.content}`.toLowerCase();
      let hits = 0;
      for (const token of tokens) {
        if (haystack.includes(token)) hits++;
      }
      const score = hits / tokens.length;
      return {
        chunkKey: row.chunkKey,
        category: row.category,
        title: row.title,
        content: row.content,
        score,
      };
    })
    .filter((row) => row.score >= 0.34)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, topK);
}

function isStrongLexicalMatch(chunks: RetrievedChunk[]): boolean {
  return chunks.length >= 2 && (chunks[0]?.score ?? 0) >= 0.5;
}

/** Index or refresh all hotel config chunks (skips unchanged content). */
export async function syncKnowledgeIndex(config: HotelConfig): Promise<void> {
  await ensureDbReady();
  const chunks = chunkHotelConfig(config);
  const model = activeEmbedModel();

  const existing = await prisma.knowledgeChunk.findMany({
    select: { chunkKey: true, contentHash: true, embedModel: true },
  });
  const existingMap = new Map(existing.map((row) => [row.chunkKey, row]));

  const staleKeys = existing
    .filter((row) => row.embedModel !== model)
    .map((row) => row.chunkKey);
  const incomingKeys = new Set(chunks.map((c) => c.chunkKey));
  const removedKeys = existing
    .map((row) => row.chunkKey)
    .filter((key) => !incomingKeys.has(key));

  if (staleKeys.length || removedKeys.length) {
    await prisma.knowledgeChunk.deleteMany({
      where: { chunkKey: { in: [...staleKeys, ...removedKeys] } },
    });
  }

  const toEmbed = chunks.filter((chunk) => {
    const hash = contentHash(embeddingText(chunk));
    const prev = existingMap.get(chunk.chunkKey);
    return !prev || prev.contentHash !== hash || prev.embedModel !== model;
  });

  for (let i = 0; i < toEmbed.length; i += EMBED_BATCH) {
    const batch = toEmbed.slice(i, i + EMBED_BATCH);
    const texts = batch.map(embeddingText);
    const vectors = await embedTexts(texts);

    for (let j = 0; j < batch.length; j++) {
      const chunk = batch[j];
      const hash = contentHash(texts[j]);
      const vector = vectors[j];
      if (!vector?.length) continue;

      await prisma.knowledgeChunk.upsert({
        where: { chunkKey: chunk.chunkKey },
        create: {
          id: randomUUID(),
          chunkKey: chunk.chunkKey,
          category: chunk.category,
          title: chunk.title,
          content: chunk.content,
          contentHash: hash,
          embedding: JSON.stringify(vector),
          embedModel: model,
        },
        update: {
          category: chunk.category,
          title: chunk.title,
          content: chunk.content,
          contentHash: hash,
          embedding: JSON.stringify(vector),
          embedModel: model,
        },
      });
    }
  }

  invalidateChunkIndexCache();
  console.log(
    `[RAG] Indexed ${chunks.length} chunks (${toEmbed.length} embedded, model=${model})`
  );
}

export function scheduleKnowledgeSync(config: HotelConfig): void {
  if (syncPromise) return;
  syncPromise = syncKnowledgeIndex(config)
    .catch((err) => console.error("[RAG] Sync failed:", err))
    .finally(() => {
      syncPromise = null;
    });
}

function isMissingTableError(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  return code === "P2021" || code === "42P01";
}

export async function getKnowledgeChunkCount(): Promise<number> {
  const rows = await loadIndexedChunks();
  return rows.length;
}

/** Semantic search over indexed hotel knowledge (cached index + lexical fast path). */
export async function retrieveRelevantChunks(
  query: string,
  options?: {
    topK?: number;
    minScore?: number;
    preferFastLexical?: boolean;
    lexicalOnly?: boolean;
  }
): Promise<RetrievedChunk[]> {
  const topK = options?.topK ?? 8;
  const minScore = options?.minScore ?? 0.32;
  const preferFastLexical = options?.preferFastLexical ?? false;
  const lexicalOnly = options?.lexicalOnly ?? false;

  if (!query.trim()) return [];

  const rows = await loadIndexedChunks();
  if (!rows.length) return [];

  const lexical = lexicalRetrieve(rows, query, topK);
  if (lexicalOnly) return lexical;
  if (preferFastLexical && isStrongLexicalMatch(lexical)) {
    return lexical;
  }

  let queryVector: number[];
  try {
    queryVector = await embedQuery(query.trim());
  } catch (err) {
    console.warn("[RAG] Query embedding failed:", err);
    return lexical;
  }
  if (!queryVector.length) return lexical;

  const scored = rows
    .map((row) => ({
      chunkKey: row.chunkKey,
      category: row.category,
      title: row.title,
      content: row.content,
      score: cosineSimilarity(queryVector, row.vector),
    }))
    .filter((row) => row.score >= minScore)
    .sort((a, b) => b.score - a.score);

  const semantic = scored.slice(0, topK);
  if (semantic.length > 0) return semantic;

  return lexical;
}

export function buildRetrievalQuery(message: string, history: { role: string; content: string }[]): string {
  const recentUser = history
    .filter((m) => m.role === "user")
    .slice(-2)
    .map((m) => m.content.trim())
    .filter(Boolean);
  return [...recentUser, message.trim()].join(" ").trim();
}

export function ragTimeoutMs(channel: "voice" | "text"): number {
  return channel === "voice" ? RAG_TIMEOUT_MS_VOICE : RAG_TIMEOUT_MS_TEXT;
}
