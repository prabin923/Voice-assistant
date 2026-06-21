import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { ensureHotelConfigLoaded } from "@/lib/hotelConfig";
import { ensureDbReady } from "@/lib/db";
import { syncWebsiteChunks, getWebsiteSyncStatus } from "@/lib/rag/websiteCrawler";

export const dynamic = "force-dynamic";
// Website crawling can take up to 60 s for large sites
export const maxDuration = 60;

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  await ensureDbReady();
  const status = await getWebsiteSyncStatus(auth.session.hotelId);
  return NextResponse.json(status);
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  await ensureDbReady();
  const config = await ensureHotelConfigLoaded({ hotelId: auth.session.hotelId });

  const websiteUrl = config.contact?.website?.trim();
  if (!websiteUrl) {
    return NextResponse.json(
      { error: "No website URL configured. Add it in Settings → Contact first." },
      { status: 400 }
    );
  }

  // Basic URL validation
  try {
    new URL(websiteUrl);
  } catch {
    return NextResponse.json(
      { error: "Invalid website URL. Make sure it starts with https://" },
      { status: 400 }
    );
  }

  // Allow overriding the URL for testing (optional body param)
  let targetUrl = websiteUrl;
  try {
    const body = await req.json().catch(() => ({})) as { url?: string };
    if (typeof body.url === "string" && body.url.trim()) {
      new URL(body.url); // validate
      targetUrl = body.url.trim();
    }
  } catch { /* ignore */ }

  try {
    const stats = await syncWebsiteChunks(targetUrl, auth.session.hotelId);
    return NextResponse.json({
      ok: true,
      websiteUrl: targetUrl,
      ...stats,
    });
  } catch (err: unknown) {
    console.error("[RAG] Website sync error:", err);
    return NextResponse.json(
      { error: "Sync failed. Check that the website is publicly accessible." },
      { status: 500 }
    );
  }
}
