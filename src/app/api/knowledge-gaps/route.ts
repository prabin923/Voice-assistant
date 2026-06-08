import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { knowledgeGaps } from "@/lib/knowledgeGaps";
import { ensureDbReady } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  await ensureDbReady();
  const gaps = await knowledgeGaps.listOpen(100);
  return NextResponse.json({ gaps });
}

export async function PATCH(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  await ensureDbReady();

  const body = (await req.json()) as { id?: string; status?: string };
  const id = String(body.id || "").trim();
  const status = body.status as "open" | "added_to_faq" | "dismissed" | undefined;

  if (!id || !status || !["open", "added_to_faq", "dismissed"].includes(status)) {
    return NextResponse.json({ error: "Invalid id or status." }, { status: 400 });
  }

  await knowledgeGaps.updateStatus(id, status);
  return NextResponse.json({ success: true });
}
