import { NextResponse } from "next/server";
import { feedback } from "@/lib/db";
import { checkRateLimit, getClientIP } from "@/lib/rateLimit";
import { requireAuth } from "@/lib/auth";

// POST is public (guests submit feedback) — rate-limited
export async function POST(req: Request) {
  try {
    const ip = getClientIP(req);
    const limit = checkRateLimit(`feedback:${ip}`, { maxRequests: 20, windowMs: 60000 });
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { messageContent, rating, comment } = await req.json();

    if (!messageContent || typeof messageContent !== "string") {
      return NextResponse.json({ error: "messageContent is required" }, { status: 400 });
    }
    if (rating !== "up" && rating !== "down") {
      return NextResponse.json({ error: "rating must be 'up' or 'down'" }, { status: 400 });
    }
    // Limit input lengths to prevent abuse
    if (messageContent.length > 2000) {
      return NextResponse.json({ error: "messageContent too long (max 2000 chars)" }, { status: 400 });
    }
    if (comment && (typeof comment !== "string" || comment.length > 1000)) {
      return NextResponse.json({ error: "comment too long (max 1000 chars)" }, { status: 400 });
    }

    const id = feedback.create({ messageContent, rating, comment });
    return NextResponse.json({ id, success: true });
  } catch {
    return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 });
  }
}

// SECURITY: Feedback data is admin-only
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const stats = feedback.stats();
    const recent = feedback.recent(10);
    return NextResponse.json({ stats, recent });
  } catch {
    return NextResponse.json({ error: "Failed to load feedback" }, { status: 500 });
  }
}
