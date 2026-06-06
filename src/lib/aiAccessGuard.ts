import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getGuestSession } from "@/lib/guestAuth";
import { getClientIP } from "@/lib/rateLimit";
import { checkRateLimitAsync } from "@/lib/rateLimitDistributed";

export type AiAccessTier = "admin" | "guest" | "demo" | "anon";

export type AiAccessResult =
  | { allowed: true; guestId?: string; tier: AiAccessTier }
  | { allowed: false; response: NextResponse };

const ANON_LIMITS: Record<"chat" | "stt" | "live", number> = {
  chat: 30,
  stt: 15,
  live: 5,
};

/** Gate expensive AI endpoints: admin, guest session, demo API key, or rate-limited anonymous. */
export async function requireAiAccess(
  req: Request,
  scope: "chat" | "stt" | "live"
): Promise<AiAccessResult> {
  const admin = await getSession();
  if (admin) return { allowed: true, tier: "admin" };

  const demoKey = process.env.DEMO_API_KEY?.trim();
  const headerKey = req.headers.get("x-demo-key")?.trim() || req.headers.get("x-api-key")?.trim();
  if (demoKey && headerKey === demoKey) {
    return { allowed: true, tier: "demo" };
  }

  const guest = await getGuestSession();
  if (guest) {
    return { allowed: true, guestId: guest.guestId, tier: "guest" };
  }

  if (process.env.AI_REQUIRE_GUEST_AUTH === "true" && process.env.NODE_ENV === "production") {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: "Guest sign-in required to use AI features.", requiresGuestAuth: true },
        { status: 401 }
      ),
    };
  }

  const ip = getClientIP(req);
  const limit = await checkRateLimitAsync(`ai-${scope}-anon:${ip}`, {
    maxRequests: ANON_LIMITS[scope],
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return {
      allowed: false,
      response: NextResponse.json(
        {
          error: "Too many AI requests. Sign in as a guest for higher limits.",
          requiresGuestAuth: true,
        },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) },
        }
      ),
    };
  }

  return { allowed: true, tier: "anon" };
}
