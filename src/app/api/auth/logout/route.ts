import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";
import { validateCsrf } from "@/lib/csrf";

export async function POST(req: Request) {
  const csrfError = await validateCsrf(req);
  if (csrfError) return csrfError;
  await clearSession();
  return NextResponse.json({ success: true });
}
