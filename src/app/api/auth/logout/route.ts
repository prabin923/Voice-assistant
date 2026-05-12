import { NextResponse } from "next/server";
import { clearSession, getSession } from "@/lib/auth";
import { validateCsrf } from "@/lib/csrf";
import { authAuditLogs } from "@/lib/db";
import { getClientIP } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const csrfError = await validateCsrf(req);
  if (csrfError) return csrfError;
  const session = await getSession();
  const ip = getClientIP(req);
  const userAgent = req.headers.get("user-agent");
  if (session) {
    authAuditLogs.create({
      hotelId: session.hotelId,
      email: session.email,
      event: "logout",
      ip,
      userAgent,
    });
  }
  await clearSession();
  return NextResponse.json({ success: true });
}
