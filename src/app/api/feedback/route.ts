import { NextResponse } from "next/server";
import { feedback } from "@/lib/db";
import { checkRateLimit, getClientIP } from "@/lib/rateLimit";

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

    const id = feedback.create({ messageContent, rating, comment });
    return NextResponse.json({ id, success: true });
  } catch (error: any) {
    console.error("Feedback API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const stats = feedback.stats();
    const recent = feedback.recent(10);
    return NextResponse.json({ stats, recent });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
