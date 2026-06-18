import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { hotels, ensureDbReady } from "@/lib/db";
import { assignHotelSlug, ensureHotelHasSlug } from "@/lib/hotelSlug";
import { validateCsrf } from "@/lib/csrf";
import { invalidateTenantConfigCache } from "@/lib/tenantContext";

export const dynamic = "force-dynamic";

function appBaseUrl(req: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

function embedSnippet(baseUrl: string, slug: string): string {
  return `<div id="staynep-assistant"></div>
<script src="${baseUrl}/embed.js" data-hotel="${slug}" data-base="${baseUrl}" async></script>`;
}

export async function GET(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  await ensureDbReady();
  const hotel = await hotels.findById(auth.session.hotelId);
  if (!hotel) {
    return NextResponse.json({ error: "Hotel not found." }, { status: 404 });
  }

  const slug = await ensureHotelHasSlug(hotel.id, hotel.name);
  const baseUrl = appBaseUrl(req);

  return NextResponse.json({
    slug,
    embedUrl: `${baseUrl}/embed/${slug}`,
    iframeUrl: `${baseUrl}/embed/${slug}`,
    snippet: embedSnippet(baseUrl, slug),
  });
}

export async function PATCH(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const csrfError = await validateCsrf(req);
  if (csrfError) return csrfError;

  const body = (await req.json().catch(() => ({}))) as { slug?: unknown };
  const requested = typeof body.slug === "string" ? body.slug : "";
  const result = await assignHotelSlug(auth.session.hotelId, requested);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  invalidateTenantConfigCache(result.slug, auth.session.hotelId);
  const baseUrl = appBaseUrl(req);

  return NextResponse.json({
    slug: result.slug,
    embedUrl: `${baseUrl}/embed/${result.slug}`,
    snippet: embedSnippet(baseUrl, result.slug),
  });
}
