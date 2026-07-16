import { NextResponse } from "next/server";
import { serviceRequests } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const [requests, counts] = await Promise.all([
    serviceRequests.listRecent(100),
    serviceRequests.countByStatus(),
  ]);
  return NextResponse.json({ requests, counts });
}

export async function PATCH(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const body = await req.json() as { id: string; status: string; staffNotes?: string };
  if (!body.id || !body.status) {
    return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
  }
  const updated = await serviceRequests.updateStatus(body.id, body.status, body.staffNotes);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ request: updated });
}
