import { NextResponse } from "next/server";
import { requireSAAuth } from "@/lib/superAdminAuth";
import { ensureDbReady } from "@/lib/db";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface HotelConfig {
  branding?: { hotelName?: string };
  rooms?: unknown[];
  customFAQ?: unknown[];
}

export async function GET() {
  const auth = await requireSAAuth();
  if (!auth.ok) return auth.error;

  await ensureDbReady();

  const rows = await prisma.hotel.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      slug: true,
      config: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const hotels = rows.map((row) => {
    let cfg: HotelConfig = {};
    try { cfg = JSON.parse(row.config) as HotelConfig; } catch { /* empty */ }

    const hotelName: string = cfg.branding?.hotelName ?? row.name;
    const isConfigured = Boolean(
      hotelName && hotelName !== "Aurelian Grand" && (cfg.rooms?.length ?? 0) > 0
    );

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      slug: row.slug ?? null,
      roomCount: cfg.rooms?.length ?? 0,
      faqCount: cfg.customFAQ?.length ?? 0,
      hotelName,
      isConfigured,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  });

  return NextResponse.json({ hotels, total: hotels.length });
}

export async function DELETE(req: Request) {
  const auth = await requireSAAuth();
  if (!auth.ok) return auth.error;

  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await ensureDbReady();
  await prisma.hotel.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
