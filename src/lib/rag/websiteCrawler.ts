import { randomUUID } from "crypto";
import { createHash } from "crypto";
import prisma from "@/lib/prisma";
import { embedTexts, activeEmbedModel, contentHash } from "@/lib/rag/embeddings";
import { invalidateChunkIndexCache } from "@/lib/rag/knowledgeIndex";

const MAX_PAGES = 15;
const MAX_CHUNK_WORDS = 350;
const MIN_CHUNK_CHARS = 80;
const FETCH_TIMEOUT_MS = 6000;

export interface CrawlStats {
  pagesVisited: number;
  chunksUpserted: number;
  chunksRemoved: number;
}

// ── HTML → clean text ────────────────────────────────────────────────────────

function extractTextFromHtml(html: string): { title: string; text: string } {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<form[\s\S]*?<\/form>/gi, " ")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  const titleMatch = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i);
  const title = (titleMatch?.[1] ?? "").replace(/\s+/g, " ").trim();

  const text = cleaned
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/?(h[1-6]|p|li|td|th|div|section|article|main|blockquote)[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s{2,}/g, " ")
    .trim();

  return { title, text };
}

function extractSameDomainLinks(html: string, pageUrl: string): string[] {
  const base = new URL(pageUrl);
  const seen = new Set<string>();
  const links: string[] = [];
  const hrefRe = /href=["']([^"'#][^"']*?)["']/gi;
  const skipExt = /\.(pdf|jpg|jpeg|png|gif|svg|webp|ico|css|js|woff|mp4|zip)(\?|$)/i;
  let m;

  while ((m = hrefRe.exec(html)) !== null) {
    try {
      const url = new URL(m[1], pageUrl);
      if (url.hostname !== base.hostname) continue;
      if (skipExt.test(url.pathname)) continue;
      const clean = `${url.origin}${url.pathname}`.replace(/\/$/, "") || url.origin;
      if (!seen.has(clean)) { seen.add(clean); links.push(clean); }
    } catch { /* skip invalid */ }
  }
  return links;
}

function urlHash(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 10);
}

function chunkPageText(
  text: string,
  title: string,
  url: string,
  hotelId: string
): { chunkKey: string; title: string; content: string }[] {
  const words = text.split(/\s+/).filter(Boolean);
  const out: { chunkKey: string; title: string; content: string }[] = [];
  const uh = urlHash(url);
  const pageLabel = title || new URL(url).pathname || url;

  for (let i = 0; i < words.length; i += MAX_CHUNK_WORDS) {
    const slice = words.slice(i, i + MAX_CHUNK_WORDS).join(" ");
    if (slice.length < MIN_CHUNK_CHARS) continue;
    const idx = Math.floor(i / MAX_CHUNK_WORDS);
    out.push({ chunkKey: `web:${hotelId}:${uh}:${idx}`, title: pageLabel, content: slice });
  }
  return out;
}

// ── Crawler ──────────────────────────────────────────────────────────────────

async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "StayNep-Bot/1.0 (hotel-voice-assistant)" },
    });
    clearTimeout(timer);
    const ct = res.headers.get("content-type") ?? "";
    if (!res.ok || !ct.includes("text/html")) return null;
    return res.text();
  } catch {
    return null;
  }
}

async function crawl(websiteUrl: string, hotelId: string) {
  const norm = (u: string) => u.replace(/\/$/, "").split("?")[0].split("#")[0];
  const visited = new Set<string>();
  const queue = [norm(websiteUrl)];
  const allChunks: { chunkKey: string; title: string; content: string }[] = [];
  let firstPage = true;

  while (queue.length > 0 && visited.size < MAX_PAGES) {
    const url = queue.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);

    const html = await fetchPage(url);
    if (!html) continue;

    const { title, text } = extractTextFromHtml(html);
    allChunks.push(...chunkPageText(text, title, url, hotelId));

    if (firstPage || visited.size <= 3) {
      const links = extractSameDomainLinks(html, url);
      for (const link of links) {
        const n = norm(link);
        if (!visited.has(n)) queue.push(n);
      }
      firstPage = false;
    }
  }

  return { chunks: allChunks, pagesVisited: visited.size };
}

// ── Public: sync website chunks into KnowledgeChunk table ───────────────────

export async function syncWebsiteChunks(
  websiteUrl: string,
  hotelId: string
): Promise<CrawlStats> {
  const { chunks, pagesVisited } = await crawl(websiteUrl, hotelId);
  const model = activeEmbedModel();
  const prefix = `web:${hotelId}:`;

  // Find existing web chunks for this hotel
  const existing = await prisma.knowledgeChunk.findMany({
    where: { chunkKey: { startsWith: prefix } },
    select: { chunkKey: true, contentHash: true, embedModel: true },
  });
  const existingMap = new Map(existing.map((r) => [r.chunkKey, r]));
  const incomingKeys = new Set(chunks.map((c) => c.chunkKey));

  // Remove chunks from pages that no longer exist
  const staleKeys = [...existingMap.keys()].filter((k) => !incomingKeys.has(k));
  if (staleKeys.length) {
    await prisma.knowledgeChunk.deleteMany({ where: { chunkKey: { in: staleKeys } } });
  }

  // Only embed chunks whose content changed
  const toEmbed = chunks.filter((c) => {
    const hash = contentHash(`${c.title}\n${c.content}`);
    const prev = existingMap.get(c.chunkKey);
    return !prev || prev.contentHash !== hash || prev.embedModel !== model;
  });

  const BATCH = 10;
  let chunksUpserted = 0;

  for (let i = 0; i < toEmbed.length; i += BATCH) {
    const batch = toEmbed.slice(i, i + BATCH);
    const texts = batch.map((c) => `${c.title}\n${c.content}`);
    const vectors = await embedTexts(texts);

    for (let j = 0; j < batch.length; j++) {
      const chunk = batch[j];
      const vector = vectors[j];
      if (!vector?.length) continue;
      const hash = contentHash(texts[j]);

      await prisma.knowledgeChunk.upsert({
        where: { chunkKey: chunk.chunkKey },
        create: {
          id: randomUUID(),
          chunkKey: chunk.chunkKey,
          category: "website",
          title: chunk.title,
          content: chunk.content,
          contentHash: hash,
          embedding: JSON.stringify(vector),
          embedModel: model,
        },
        update: {
          category: "website",
          title: chunk.title,
          content: chunk.content,
          contentHash: hash,
          embedding: JSON.stringify(vector),
          embedModel: model,
        },
      });
      chunksUpserted++;
    }
  }

  invalidateChunkIndexCache();
  return { pagesVisited, chunksUpserted, chunksRemoved: staleKeys.length };
}

// ── Status query ─────────────────────────────────────────────────────────────

export async function getWebsiteSyncStatus(hotelId: string): Promise<{
  chunkCount: number;
  lastSyncedAt: string | null;
}> {
  const rows = await prisma.knowledgeChunk.findMany({
    where: { chunkKey: { startsWith: `web:${hotelId}:` } },
    select: { updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  if (!rows.length) return { chunkCount: 0, lastSyncedAt: null };
  return {
    chunkCount: rows.length,
    lastSyncedAt: rows[0].updatedAt.toISOString(),
  };
}
