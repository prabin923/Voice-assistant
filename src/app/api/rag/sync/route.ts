import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { ensureHotelConfigLoaded } from "@/lib/hotelConfig";
import { ensureDbReady } from "@/lib/db";
import { syncWebsiteChunks, getWebsiteSyncStatus } from "@/lib/rag/websiteCrawler";
import { getKnowledgeChunkStats, syncKnowledgeIndex } from "@/lib/rag/knowledgeIndex";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** GET — returns chunk counts for both sources. */
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  await ensureDbReady();
  const [webStatus, stats] = await Promise.all([
    getWebsiteSyncStatus(auth.session.hotelId),
    getKnowledgeChunkStats(),
  ]);

  return NextResponse.json({
    website: {
      chunkCount: webStatus.chunkCount,
      lastSyncedAt: webStatus.lastSyncedAt,
    },
    settings: {
      chunkCount: stats.config,
    },
    total: stats.total,
  });
}

/** POST — sync website chunks (body: {}) or force-resync settings (body: { source: "settings" }). */
export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  await ensureDbReady();
  const config = await ensureHotelConfigLoaded({ hotelId: auth.session.hotelId });

  const body = await req.json().catch(() => ({})) as { source?: string; url?: string };

  // Settings resync
  if (body.source === "settings") {
    try {
      await syncKnowledgeIndex(config, auth.session.hotelId);
      const stats = await getKnowledgeChunkStats();
      return NextResponse.json({ ok: true, source: "settings", settingsChunks: stats.config });
    } catch (err: unknown) {
      console.error("[RAG] Settings sync error:", err);
      return NextResponse.json({ error: "Settings sync failed." }, { status: 500 });
    }
  }

  // Website sync (default)
  const websiteUrl = config.contact?.website?.trim();
  if (!websiteUrl) {
    return NextResponse.json(
      { error: "No website URL configured. Add it in Settings → Contact first." },
      { status: 400 }
    );
  }

  try {
    new URL(websiteUrl);
  } catch {
    return NextResponse.json(
      { error: "Invalid website URL. Make sure it starts with https://" },
      { status: 400 }
    );
  }

  let targetUrl = websiteUrl;
  if (typeof body.url === "string" && body.url.trim()) {
    try { new URL(body.url); targetUrl = body.url.trim(); } catch { /* ignore */ }
  }

  try {
    const stats = await syncWebsiteChunks(targetUrl, auth.session.hotelId);
    return NextResponse.json({ ok: true, source: "website", websiteUrl: targetUrl, ...stats });
  } catch (err: unknown) {
    console.error("[RAG] Website sync error:", err);
    return NextResponse.json(
      { error: "Sync failed. Check that the website is publicly accessible." },
      { status: 500 }
    );
  }
}
