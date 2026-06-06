import { describe, expect, it } from "vitest";
import { checkGuestChatRateLimit } from "@/lib/guestRateLimit";
import { getGuestLoyaltyTier } from "@/lib/guestAuth";

describe("guestRateLimit", () => {
  it("allows first anonymous request", async () => {
    const result = await checkGuestChatRateLimit({ ip: "test-ip-1" });
    expect(result.allowed).toBe(true);
  });

  it("requires auth after anonymous burst", async () => {
    const ip = `burst-ip-${Date.now()}`;
    for (let i = 0; i < 8; i++) {
      await checkGuestChatRateLimit({ ip });
    }
    const blocked = await checkGuestChatRateLimit({ ip });
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.requiresAuth).toBe(true);
    }
  });
});

describe("guest loyalty tiers", () => {
  it("maps visit counts to tiers", () => {
    expect(getGuestLoyaltyTier(0)).toBe("new");
    expect(getGuestLoyaltyTier(2)).toBe("returning");
    expect(getGuestLoyaltyTier(10)).toBe("loyal");
  });
});
