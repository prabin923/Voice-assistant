import { checkRateLimitAsync } from "@/lib/rateLimitDistributed";
import { guests } from "@/lib/db";

/** Burst limits per minute */
export const ANON_CHAT_BURST = 8;
export const GUEST_CHAT_BURST = 30;

/** Daily message caps */
export const ANON_CHAT_DAILY = 10;
export const GUEST_CHAT_DAILY = 100;

export type GuestRateLimitResult =
  | { allowed: true; remainingDaily?: number }
  | { allowed: false; reason: "burst" | "daily"; retryAfterMs?: number; requiresAuth?: boolean };

export async function checkGuestChatRateLimit(input: {
  ip: string;
  guestId?: string | null;
}): Promise<GuestRateLimitResult> {
  const { ip, guestId } = input;

  if (guestId) {
    const burst = await checkRateLimitAsync(`chat-guest:${guestId}`, {
      maxRequests: GUEST_CHAT_BURST,
      windowMs: 60_000,
    });
    if (!burst.allowed) {
      return { allowed: false, reason: "burst", retryAfterMs: burst.retryAfterMs };
    }

    const dailyCount = await guests.todayMessageCount(guestId);
    if (dailyCount >= GUEST_CHAT_DAILY) {
      return { allowed: false, reason: "daily" };
    }

    return { allowed: true, remainingDaily: GUEST_CHAT_DAILY - dailyCount };
  }

  const burst = await checkRateLimitAsync(`chat-anon:${ip}`, {
    maxRequests: ANON_CHAT_BURST,
    windowMs: 60_000,
  });
  if (!burst.allowed) {
    return {
      allowed: false,
      reason: "burst",
      retryAfterMs: burst.retryAfterMs,
      requiresAuth: true,
    };
  }

  const dailyKey = `chat-anon-daily:${ip}`;
  const daily = await checkRateLimitAsync(dailyKey, {
    maxRequests: ANON_CHAT_DAILY,
    windowMs: 24 * 60 * 60 * 1000,
  });
  if (!daily.allowed) {
    return { allowed: false, reason: "daily", requiresAuth: true };
  }

  return { allowed: true, remainingDaily: daily.remaining };
}
