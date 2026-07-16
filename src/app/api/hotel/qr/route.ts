import { NextResponse } from "next/server";
import { generateQrSvg } from "@/lib/qrCode";
import { normalizeHotelSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";

function appBaseUrl(req: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = normalizeHotelSlug(url.searchParams.get("slug"));
  if (!slug) {
    return NextResponse.json({ error: "Missing hotel slug." }, { status: 400 });
  }

  const baseUrl = appBaseUrl(req);
  // Point to the dedicated embed or assistant page for this hotel slug
  const targetUrl = `${baseUrl}/assistant?hotel=${slug}`;
  const svg = generateQrSvg(targetUrl, 300);

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
