import { NextResponse } from "next/server";
import {
  isSuperAdminConfigured,
  verifySuperAdminKey,
  createSAToken,
  setSACookie,
  clearSACookie,
} from "@/lib/superAdminAuth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isSuperAdminConfigured()) {
    return NextResponse.json(
      { error: "Super-admin not configured. Set SUPER_ADMIN_KEY in your environment." },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const key = typeof body.key === "string" ? body.key : "";

  if (!verifySuperAdminKey(key)) {
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ error: "Invalid key" }, { status: 401 });
  }

  const token = await createSAToken();
  await setSACookie(token);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await clearSACookie();
  return NextResponse.json({ ok: true });
}
