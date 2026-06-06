import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { authAuditLogs, ensureDbReady } from "@/lib/db";

export async function GET(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  await ensureDbReady();

  const url = new URL(req.url);
  const limitRaw = Number.parseInt(url.searchParams.get("limit") || "30", 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 30;
  const rows = await authAuditLogs.recentByHotel(auth.session.hotelId, limit);
  return NextResponse.json({ logs: rows });
}
