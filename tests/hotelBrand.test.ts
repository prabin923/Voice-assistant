import { describe, expect, it } from "vitest";
import {
  defaultWelcomeMessage,
  getGuestWelcomeHeadline,
  getGuestWelcomeSubtext,
  syncBrandingOnHotelRename,
} from "@/lib/hotelBrand";
import type { BrandingConfig } from "@/lib/hotelConfig";

const baseBranding = (): BrandingConfig => ({
  hotelName: "Aurelian Grand",
  tagline: "Tagline",
  accentColor: "#c9a96e",
  welcomeMessage: defaultWelcomeMessage("Aurelian Grand"),
  farewellMessage: "Thank you for choosing Aurelian Grand. Have a wonderful day!",
});

describe("syncBrandingOnHotelRename", () => {
  it("updates welcome and farewell when hotel name changes", () => {
    const synced = syncBrandingOnHotelRename("Aurelian Grand", "Alpine Lodge", baseBranding());
    expect(synced.hotelName).toBe("Alpine Lodge");
    expect(synced.welcomeMessage).toBe(defaultWelcomeMessage("Alpine Lodge"));
    expect(synced.farewellMessage).toContain("Alpine Lodge");
  });

  it("keeps custom welcome that does not mention the old name", () => {
    const custom = {
      ...baseBranding(),
      welcomeMessage: "Hello guest — ask me anything about your stay.",
    };
    const synced = syncBrandingOnHotelRename("Aurelian Grand", "Alpine Lodge", custom);
    expect(synced.welcomeMessage).toBe("Hello guest — ask me anything about your stay.");
  });
});

describe("guest welcome display", () => {
  it("uses configured hotel name as headline", () => {
    expect(getGuestWelcomeHeadline({ ...baseBranding(), hotelName: "Summit Inn" })).toBe("Summit Inn");
  });

  it("returns neutral subtext when welcome still references another hotel", () => {
    const branding = {
      ...baseBranding(),
      hotelName: "Summit Inn",
      welcomeMessage: defaultWelcomeMessage("Aurelian Grand"),
    };
    expect(getGuestWelcomeSubtext(branding)).toBe("How can I assist you with your stay today?");
  });

  it("strips welcome prefix when message matches current hotel", () => {
    const branding = {
      ...baseBranding(),
      hotelName: "Summit Inn",
      welcomeMessage: defaultWelcomeMessage("Summit Inn"),
    };
    expect(getGuestWelcomeSubtext(branding)).toBe("How can I assist you with your stay today?");
  });
});
