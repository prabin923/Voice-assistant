import { describe, it, expect } from "vitest";
import { detectDateRange, addDays, todayIsoDate } from "@/lib/dateParsing";
import {
  isBookingIntent,
  isAvailabilityIntent,
  isCancelIntent,
  isModifyIntent,
  shouldRunBookingFlow,
} from "@/lib/bookingFlow";
import { formatAlternativeSuggestions } from "@/lib/availabilityQuery";

describe("dateParsing", () => {
  it("parses ISO date ranges", () => {
    const result = detectDateRange("book from 2026-08-01 to 2026-08-05", []);
    expect(result.checkIn).toBe("2026-08-01");
    expect(result.checkOut).toBe("2026-08-05");
    expect(result.parseFailed).toBe(false);
  });

  it("parses tomorrow plus one night", () => {
    const tomorrow = addDays(todayIsoDate(), 1);
    const result = detectDateRange("I need a room tomorrow for one night", []);
    expect(result.checkIn).toBe(tomorrow);
    expect(result.checkOut).toBe(addDays(tomorrow, 1));
  });

  it("parses named month dates", () => {
    const result = detectDateRange("June 15 to June 18", []);
    const year = new Date().getUTCFullYear();
    expect(result.checkIn).toBe(`${year}-06-15`);
    expect(result.checkOut).toBe(`${year}-06-18`);
  });

  it("asks for clarification on single date without nights", () => {
    const result = detectDateRange("check in on 2026-09-01", []);
    expect(result.checkIn).toBe("2026-09-01");
    expect(result.needsClarification).toBe(true);
  });
});

describe("bookingFlow intents", () => {
  it("detects booking intent", () => {
    expect(isBookingIntent("I'd like to book a room", "en-US")).toBe(true);
    expect(isBookingIntent("what is the pool hours", "en-US")).toBe(false);
  });

  it("detects availability intent", () => {
    expect(isAvailabilityIntent("Is a Deluxe room available next week?", "en-US")).toBe(true);
    expect(isBookingIntent("cancel my booking", "en-US")).toBe(false);
  });

  it("detects cancel and modify intents", () => {
    expect(isCancelIntent("Please cancel my reservation")).toBe(true);
    expect(isModifyIntent("I need to change my booking dates")).toBe(true);
  });

  it("skips booking flow for simple greetings", () => {
    expect(shouldRunBookingFlow("hello there", [], "en-US")).toBe(false);
    expect(shouldRunBookingFlow("what time is check-in?", [], "en-US")).toBe(false);
  });
});

describe("availability formatting", () => {
  it("formats alternative suggestions", () => {
    const text = formatAlternativeSuggestions([
      { roomType: "Deluxe Room", checkIn: "2026-06-10", checkOut: "2026-06-12", available: 2, kind: "other_room" },
    ]);
    expect(text).toContain("Deluxe Room");
    expect(text).toContain("Which would you prefer");
  });
});

describe("buildSystemInstruction", () => {
  it("includes escalation rules and RAG hotel-facts guidance", async () => {
    const { buildSystemInstruction } = await import("@/lib/responseEngine");
    const prompt = buildSystemInstruction("text");
    expect(prompt).toContain("HOTEL FACTS");
    expect(prompt).toContain("[ESCALATE]");
  });
});
