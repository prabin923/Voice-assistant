import { NextResponse } from "next/server";
import { requireSAAuth, generateInviteToken } from "@/lib/superAdminAuth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await requireSAAuth();
  if (!auth.ok) return auth.error;

  const token = await generateInviteToken();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ?? "";
  const base = appUrl || new URL(req.url).origin;
  const inviteUrl = `${base}/admin/register?invite=${encodeURIComponent(token)}`;

  return NextResponse.json({ token, inviteUrl, expiresIn: "7 days" });
}
