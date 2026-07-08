import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import type { HotelConfig } from "@/lib/hotelConfig";
import { ensureDbReady } from "@/lib/db";
import { getTenantStore } from "@/lib/tenantContext";
import { chunkHotelConfig } from "@/lib/rag/chunkHotelConfig";
import { activeEmbedModel, contentHash, embedQuery, embedTexts } from "@/lib/rag/embeddings";
import { cosineSimilarity } from "@/lib/rag/similarity";
import {
  adaptiveMinScore,
  isStrongLexicalMatch,
  lexicalRetrieve,
  selectByScore,
} from "@/lib/rag/lexical";

export type RetrievedChunk = {
  chunkKey: string;
  category: string;
  title: string;
  content: string;
  score: number;
};

type IndexedChunk = {
  chunkKey: string;
  hotelId: string | null;
  category: string;
  title: string;
  content: string;
  vector: number[];
};

// Config chunks are namespaced per hotel: `t:<hotelId>:<baseKey>`. Website
// chunks use their own `web:<hotelId>:…` scheme (managed by websiteCrawler).
const TENANT_PREFIX = "t:";
function tenantChunkKey(hotelId: string, baseKey: string): string {
  return `${TENANT_PREFIX}${hotelId}:${baseKey}`;
}

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
        hotelId: true,
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
          hotelId: row.hotelId,
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

/** Index or refresh all hotel config chunks (skips unchanged content).
 *  Only touches config-origin chunks — website chunks (web:* prefix) are
 *  managed exclusively by syncWebsiteChunks() in websiteCrawler.ts.
 */
export async function syncKnowledgeIndex(config: HotelConfig, hotelIdArg?: string): Promise<void> {
  await ensureDbReady();
  const hotelId = hotelIdArg ?? getTenantStore()?.hotelId;
  if (!hotelId) {
    console.warn("[RAG] syncKnowledgeIndex called without a hotelId — skipping (per-tenant scoping requires one).");
    return;
  }

  const chunks = chunkHotelConfig(config);
  const model = activeEmbedModel();
  const keyPrefix = tenantChunkKey(hotelId, "");

  // Scope to THIS tenant's config chunks (t:<hotelId>:…) — never touch other
  // tenants' chunks or web:* chunks.
  const existing = await prisma.knowledgeChunk.findMany({
    where: { chunkKey: { startsWith: keyPrefix } },
    select: { chunkKey: true, contentHash: true, embedModel: true },
  });
  const existingMap = new Map(existing.map((row) => [row.chunkKey, row]));

  const staleKeys = existing
    .filter((row) => row.embedModel !== model)
    .map((row) => row.chunkKey);
  const incomingKeys = new Set(chunks.map((c) => tenantChunkKey(hotelId, c.chunkKey)));
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
    const prev = existingMap.get(tenantChunkKey(hotelId, chunk.chunkKey));
    return !prev || prev.contentHash !== hash || prev.embedModel !== model;
  });

  for (let i = 0; i < toEmbed.length; i += EMBED_BATCH) {
    const batch = toEmbed.slice(i, i + EMBED_BATCH);
    const texts = batch.map(embeddingText);
    const vectors = await embedTexts(texts);

    for (let j = 0; j < batch.length; j++) {
      const chunk = batch[j];
      const key = tenantChunkKey(hotelId, chunk.chunkKey);
      const hash = contentHash(texts[j]);
      const vector = vectors[j];
      if (!vector?.length) continue;

      await prisma.knowledgeChunk.upsert({
        where: { chunkKey: key },
        create: {
          id: randomUUID(),
          chunkKey: key,
          hotelId,
          category: chunk.category,
          title: chunk.title,
          content: chunk.content,
          contentHash: hash,
          embedding: JSON.stringify(vector),
          embedModel: model,
        },
        update: {
          hotelId,
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
    `[RAG] Indexed ${chunks.length} chunks for hotel ${hotelId} (${toEmbed.length} embedded, model=${model})`
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

/** Returns chunk counts split by source — useful for the settings UI. */
export async function getKnowledgeChunkStats(): Promise<{
  total: number;
  config: number;
  website: number;
}> {
  const rows = await loadIndexedChunks();
  const website = rows.filter((r) => r.chunkKey.startsWith("web:")).length;
  return { total: rows.length, config: rows.length - website, website };
}

/**
 * Restrict the global chunk index to the current tenant so one hotel never
 * retrieves another hotel's content. Config chunks carry a `hotelId` column;
 * website chunks are keyed `web:<hotelId>:…`. Keep only the current tenant's of
 * each. Chunks with no owner (legacy/global, pre-migration) are dropped once a
 * tenant context is active so stale shared content can't leak.
 */
function scopeToTenant(rows: IndexedChunk[]): IndexedChunk[] {
  const hotelId = getTenantStore()?.hotelId;
  if (!hotelId) return rows; // no tenant context (single-tenant / scripts)
  return rows.filter((r) => {
    if (r.chunkKey.startsWith("web:")) return r.chunkKey.split(":")[1] === hotelId;
    return r.hotelId === hotelId; // config chunks: match the owning hotel
  });
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

  const rows = scopeToTenant(await loadIndexedChunks());
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

  const scored = rows.map((row) => ({
    chunkKey: row.chunkKey,
    category: row.category,
    title: row.title,
    content: row.content,
    score: cosineSimilarity(queryVector, row.vector),
  }));

  // Relax the threshold for non-Latin (cross-lingual) queries, and apply a soft
  // floor: rather than returning nothing (which forces the metadata-only
  // fallback and invites hallucination/repetition), surface the single best
  // real chunk when one exists. The grounding rule still lets the model decline.
  const semantic = selectByScore(scored, {
    minScore: adaptiveMinScore(query, minScore),
    floor: 0.18,
    topK,
  });
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
