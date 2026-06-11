import { describe, expect, it } from "vitest";
import { isDiningReservationIntent } from "@/lib/diningFlow";
import { detectPartySize, detectReservationTime } from "@/lib/timeParsing";

describe("isDiningReservationIntent", () => {
  it("detects table reservation requests", () => {
    expect(isDiningReservationIntent("I'd like to book a table for 4 tomorrow at 7pm", "en-US")).toBe(true);
    expect(isDiningReservationIntent("reserve a table at the main restaurant", "en-US")).toBe(true);
  });

  it("does not treat hours-only questions as reservations", () => {
    expect(isDiningReservationIntent("What time does the restaurant open?", "en-US")).toBe(false);
  });
});

describe("timeParsing", () => {
  it("parses party size and time", () => {
    expect(detectPartySize("table for 4 please", [])).toBe(4);
    expect(detectReservationTime("tomorrow at 7:30 pm", [])).toBe("19:30");
  });
});
