import { NextResponse } from "next/server";
import { ensureDbReady } from "@/lib/db";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface HotelBranding {
  hotelName?: string;
  tagline?: string;
  accentColor?: string;
  logoUrl?: string;
}

interface HotelContact {
  city?: string;
  country?: string;
}

interface HotelRoom {
  pricePerNight?: number;
  currency?: string;
}

interface HotelAmenity {
  name?: string;
}

interface HotelConfig {
  branding?: HotelBranding;
  contact?: HotelContact;
  rooms?: HotelRoom[];
  amenities?: HotelAmenity[];
}

export async function GET() {
  try {
    await ensureDbReady();

    const rows = await prisma.hotel.findMany({
      where: { slug: { not: null } },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, slug: true, config: true },
    });

    const hotels = rows.map((row) => {
      let cfg: HotelConfig = {};
      try { cfg = JSON.parse(row.config) as HotelConfig; } catch { /* skip */ }

      const branding = cfg.branding ?? {};
      const contact = cfg.contact ?? {};
      const rooms = cfg.rooms ?? [];
      const prices = rooms.map((r) => r.pricePerNight ?? 0).filter((p) => p > 0);
      const startingPrice = prices.length > 0 ? Math.min(...prices) : null;

      return {
        id: row.id,
        slug: row.slug,
        hotelName: branding.hotelName ?? row.name,
        tagline: branding.tagline ?? null,
        accentColor: branding.accentColor ?? null,
        logoUrl: branding.logoUrl ?? null,
        city: contact.city ?? null,
        country: contact.country ?? null,
        roomCount: rooms.length,
        startingPrice,
        currency: rooms[0]?.currency ?? "USD",
        amenities: (cfg.amenities ?? [])
          .slice(0, 4)
          .map((a) => a.name ?? "")
          .filter(Boolean),
      };
    });

    return NextResponse.json({ hotels });
  } catch {
    return NextResponse.json({ hotels: [] });
  }
}
