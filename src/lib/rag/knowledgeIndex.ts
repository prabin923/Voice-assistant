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

const EMBED_BATCH = 12;

let syncPromise: Promise<void> | null = null;

function embeddingText(chunk: { title: string; content: string }): string {
  return `${chunk.title}\n${chunk.content}`;
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
  try {
    await ensureDbReady();
    return await prisma.knowledgeChunk.count();
  } catch (err) {
    if (!isMissingTableError(err)) {
      console.warn("[RAG] Chunk count failed:", err);
    }
    return 0;
  }
}

/** Semantic search over indexed hotel knowledge. */
export async function retrieveRelevantChunks(
  query: string,
  options?: { topK?: number; minScore?: number }
): Promise<RetrievedChunk[]> {
  const topK = options?.topK ?? 8;
  const minScore = options?.minScore ?? 0.32;

  if (!query.trim()) return [];

  let rows: Awaited<ReturnType<typeof prisma.knowledgeChunk.findMany>>;
  try {
    await ensureDbReady();
    rows = await prisma.knowledgeChunk.findMany();
  } catch (err) {
    if (!isMissingTableError(err)) {
      console.warn("[RAG] Retrieval failed:", err);
    }
    return [];
  }

  if (!rows.length) return [];

  let queryVector: number[];
  try {
    queryVector = await embedQuery(query.trim());
  } catch (err) {
    console.warn("[RAG] Query embedding failed:", err);
    return [];
  }
  if (!queryVector.length) return [];

  const scored = rows
    .map((row) => {
      let vector: number[] = [];
      try {
        vector = JSON.parse(row.embedding) as number[];
      } catch {
        return null;
      }
      const score = cosineSimilarity(queryVector, vector);
      return {
        chunkKey: row.chunkKey,
        category: row.category,
        title: row.title,
        content: row.content,
        score,
      };
    })
    .filter((row): row is RetrievedChunk => row !== null && row.score >= minScore)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, topK);
}

export function buildRetrievalQuery(message: string, history: { role: string; content: string }[]): string {
  // Include recent turns so follow-ups ("what about parking?") retrieve the right facts.
  const recent = history
    .slice(-4)
    .map((m) => m.content.trim())
    .filter(Boolean);
  return [...recent, message.trim()].join(" ").trim();
}
