import { describe, expect, it } from "vitest";
import { sanitizeAccentColor, sanitizeBranding, isSafePublicUrl } from "@/lib/brandingValidation";
import { sanitizeChatMessage, sanitizeChatHistory, MAX_CHAT_MESSAGE_LENGTH } from "@/lib/chatValidation";

describe("brandingValidation", () => {
  it("sanitizes invalid accent colors", () => {
    expect(sanitizeAccentColor("javascript:alert(1)", "#abc123")).toBe("#abc123");
    expect(sanitizeAccentColor("#C9A227")).toBe("#c9a227");
  });

  it("strips unsafe logo URLs", () => {
    const out = sanitizeBranding({
      hotelName: "Test",
      tagline: "t",
      accentColor: "#c9a227",
      welcomeMessage: "hi",
      farewellMessage: "bye",
      logoUrl: "javascript:alert(1)",
    });
    expect(out.logoUrl).toBeUndefined();
  });

  it("allows https logo URLs", () => {
    expect(isSafePublicUrl("https://example.com/logo.png")).toBe(true);
  });
});

describe("chatValidation", () => {
  it("truncates long messages", () => {
    const long = "a".repeat(MAX_CHAT_MESSAGE_LENGTH + 100);
    expect(sanitizeChatMessage(long)?.length).toBe(MAX_CHAT_MESSAGE_LENGTH);
  });

  it("filters invalid history", () => {
    const history = sanitizeChatHistory([
      { role: "user", content: "hello" },
      { role: "bot", content: "ignored" },
      { role: "assistant", content: "hi there" },
    ]);
    expect(history).toHaveLength(2);
    expect(history[0].role).toBe("user");
    expect(history[1].role).toBe("assistant");
  });
});
