import { NextResponse } from "next/server";
import { validateCsrf } from "@/lib/csrf";
import { clearGuestSession } from "@/lib/guestAuth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const csrfError = await validateCsrf(req);
  if (csrfError) return csrfError;

  await clearGuestSession();
  return NextResponse.json({ success: true });
}
