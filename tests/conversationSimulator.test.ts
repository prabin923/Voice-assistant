import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock the DB layer so booking flow runs without a real database ──
type Booking = {
  id: string;
  room_type: string;
  check_in: string;
  check_out: string;
  rooms: number;
  guest_name: string;
  guest_phone: string;
  guest_email: string | null;
  status: string;
  special_requests?: string | null;
};

const store: { bookings: Booking[]; inventory: Record<string, number> } = {
  bookings: [],
  inventory: {},
};

vi.mock("@/lib/db", () => ({
  ensureDbReady: vi.fn(async () => {}),
  availability: {
    get: vi.fn(async (roomType: string) => ({
      available: store.inventory[roomType] ?? 5,
      defaultInventory: 5,
    })),
  },
  bookings: {
    findByIdPrefix: vi.fn(async (prefix: string) =>
      store.bookings.find((b) => b.id.startsWith(prefix)) ?? null
    ),
    getById: vi.fn(async (id: string) => store.bookings.find((b) => b.id === id) ?? null),
    listByGuestId: vi.fn(async () => store.bookings),
    appendSpecialRequest: vi.fn(async (id: string, note: string) => {
      const b = store.bookings.find((x) => x.id === id);
      if (b) b.special_requests = note;
      return b ?? null;
    }),
  },
}));

vi.mock("@/lib/bookingNotify", () => ({
  notifyBookingComplete: vi.fn(),
}));

vi.mock("@/lib/diningReservationService", () => ({
  toDiningSummary: (r: Record<string, unknown>) => r,
  notifyDiningReservationComplete: vi.fn(),
  createDiningReservationSafe: vi.fn(async (input: Record<string, unknown>) => ({
    ok: true,
    reservation: {
      id: "dine1234-0000-0000-0000-000000000000",
      venueName: input.venueName,
      reservationDate: input.reservationDate,
      reservationTime: input.reservationTime,
      partySize: input.partySize,
      guestName: input.guestName,
      guestPhone: input.guestPhone,
      status: "confirmed",
    },
  })),
}));

vi.mock("@/lib/bookingService", () => ({
  createBookingSafe: vi.fn(async (input: Record<string, unknown>) => {
    const roomType = input.roomType as string;
    const avail = store.inventory[roomType] ?? 5;
    if (avail <= 0) return { ok: false, status: 409 };
    const booking: Booking = {
      id: "abcd1234-0000-0000-0000-000000000000",
      room_type: roomType,
      check_in: input.checkIn as string,
      check_out: input.checkOut as string,
      rooms: input.rooms as number,
      guest_name: input.guestName as string,
      guest_phone: input.guestPhone as string,
      guest_email: (input.guestEmail as string) ?? null,
      status: "confirmed",
    };
    store.bookings.push(booking);
    return { ok: true, booking };
  }),
}));

import { handleGuestServiceFlow, shouldRunGuestServiceFlow } from "@/lib/guestServiceFlow";
import { DEFAULT_HOTEL_CONFIG } from "@/lib/hotelConfig";
import { addDays, todayIsoDate } from "@/lib/dateParsing";
import type { PendingBooking, PendingDining } from "@/lib/guestServiceFlow";

type Turn = { role: "user" | "assistant"; content: string };

/** Runs a scripted multi-turn conversation, threading pendingBooking/pendingDining like the real API. */
async function runConversation(userTurns: string[]) {
  const config = DEFAULT_HOTEL_CONFIG;
  const history: Turn[] = [];
  let pendingBooking: PendingBooking | null = null;
  let pendingDining: PendingDining | null = null;
  const replies: string[] = [];

  for (const userMsg of userTurns) {
    history.push({ role: "user", content: userMsg });
    const shouldRun = shouldRunGuestServiceFlow(
      userMsg, history, "en-US", config.rooms.map((r) => r.name), pendingBooking, pendingDining
    );

    let reply: string;
    if (shouldRun) {
      const result = await handleGuestServiceFlow({
        message: userMsg, langCode: "en-US", config, history,
        pendingBooking, pendingDining,
      });
      if (result.handled) {
        reply = result.reply ?? "";
        if (result.pendingBooking !== undefined) pendingBooking = result.pendingBooking;
        if (result.pendingDining !== undefined) pendingDining = result.pendingDining;
      } else {
        reply = "[FELL THROUGH TO AI]";
      }
    } else {
      reply = "[FELL THROUGH TO AI]";
    }
    replies.push(reply);
    history.push({ role: "assistant", content: reply });
  }
  return { replies, pendingBooking, bookings: store.bookings };
}

beforeEach(() => {
  store.bookings = [];
  store.inventory = {};
});

describe("autonomous booking — multi-turn flows", () => {
  const ci = addDays(todayIsoDate(), 7);
  const co = addDays(todayIsoDate(), 9);

  it("completes a booking spread across many turns (room → dates → name → phone → yes)", async () => {
    const { replies, bookings } = await runConversation([
      "I want to book a room",
      "Deluxe King Room",
      `from ${ci} to ${co}`,
      "my name is John Smith",
      "my phone number is +1 555 123 4567",
      "yes",
    ]);
    // Final reply must be a confirmation, and a booking must exist
    expect(bookings.length).toBe(1);
    expect(replies[replies.length - 1].toLowerCase()).toMatch(/confirmed|all set|booking #/);
  });

  it("completes a booking when name AND phone are given in one message", async () => {
    const { bookings } = await runConversation([
      `Book a Deluxe King Room from ${ci} to ${co}`,
      "My name is Jane Doe and my number is +1 555 987 6543",
      "yes",
    ]);
    expect(bookings.length).toBe(1);
    expect(bookings[0].guest_name).toBe("Jane Doe"); // must NOT capture "and my number is"
  });

  it("completes booking with everything in the first message", async () => {
    const { bookings } = await runConversation([
      `I'd like to book the Grand Suite from ${ci} to ${co} for John Appleseed, phone +1 555 222 3333`,
      "yes",
    ]);
    expect(bookings.length).toBe(1);
  });

  it("does not stall after collecting the room type", async () => {
    const { replies } = await runConversation([
      "I want to book",
      "Grand Suite",
    ]);
    // After room type, it should ask for DATES, not repeat the generic prompt
    expect(replies[1].toLowerCase()).toMatch(/date|when|check-in|check.?out/);
  });
});

describe("autonomous booking — varied phrasings all reach confirmation", () => {
  const ci = addDays(todayIsoDate(), 10);
  const co = addDays(todayIsoDate(), 12);

  const phrasings: Array<{ name: string; turns: string[] }> = [
    { name: "casual", turns: [`can i get a deluxe king room ${ci} to ${co}`, "John Carter, 5551234567", "yes"] },
    { name: "I'd like to reserve", turns: [`I'd like to reserve a Grand Suite from ${ci} until ${co}`, "name is Maria Lopez, phone 9779812345678", "yes"] },
    { name: "need a room", turns: [`I need a room ${ci} to ${co}`, "Deluxe King Room", "It's Tom Hardy and you can reach me at 555-867-5309", "yes"] },
    { name: "nights-based", turns: [`book the Grand Suite checking in ${ci} for 2 nights`, "under David Kim", "phone +44 7700 900123", "yes"] },
  ];

  for (const { name, turns } of phrasings) {
    it(`completes booking — ${name}`, async () => {
      const { bookings, replies } = await runConversation(turns);
      expect(bookings.length, `replies:\n${replies.join("\n")}`).toBe(1);
      expect(replies[replies.length - 1].toLowerCase()).toMatch(/confirmed|all set|booking #/);
    });
  }

  it("offers room options when dates given but no room type", async () => {
    const { replies } = await runConversation([`I want a room from ${ci} to ${co}`]);
    expect(replies[0].toLowerCase()).toMatch(/deluxe|suite|which room|room type/);
  });

  it("rejects a past date and re-asks", async () => {
    const past = addDays(todayIsoDate(), -5);
    const { replies } = await runConversation([`book a Deluxe King Room from ${past} to ${addDays(past, 2)}`]);
    expect(replies[0].toLowerCase()).toMatch(/past|what dates|which date/);
  });

  it("lets guest change their mind at confirmation", async () => {
    const { replies, pendingBooking } = await runConversation([
      `book a Deluxe King Room ${ci} to ${co} for Sam Wells, 5551112222`,
      "no",
    ]);
    expect(replies[1].toLowerCase()).toMatch(/change|what would you like/);
    expect(pendingBooking).toBeNull();
  });

  it("books with relative dates (tonight, next-week phrasing)", async () => {
    const { bookings, replies } = await runConversation([
      "I need a room tonight for 1 night",
      "Deluxe King Room",
      "name is Rita Ora, phone 5553334444",
      "yes",
    ]);
    expect(bookings.length, `replies:\n${replies.join("\n")}`).toBe(1);
  });

  it("books multiple rooms", async () => {
    const { bookings } = await runConversation([
      `book 2 Deluxe King Room ${ci} to ${co} for Greg House, 5556667777`,
      "yes",
    ]);
    expect(bookings.length).toBe(1);
    expect(bookings[0].rooms).toBe(2);
  });

  it("resumes booking after an off-topic question mid-flow", async () => {
    const { bookings, replies } = await runConversation([
      `book a Grand Suite ${ci} to ${co} for Lea Michele, 5550001111`,
      "wait, where can I park?",   // topic escape — must NOT book yet
      "ok yes please confirm",      // back to booking
    ]);
    // The parking question should fall through to AI, booking still pending, then confirmed
    expect(replies[1]).toBe("[FELL THROUGH TO AI]");
    expect(bookings.length, `replies:\n${replies.join("\n")}`).toBe(1);
  });

  it("changes dates at the confirmation step", async () => {
    const newCi = addDays(todayIsoDate(), 20);
    const newCo = addDays(todayIsoDate(), 22);
    const { bookings, replies } = await runConversation([
      `book a Deluxe King Room ${ci} to ${co} for Ben Stiller, 5552223333`,
      `actually change it to ${newCi} to ${newCo}`,
      "yes",
    ]);
    expect(bookings.length, `replies:\n${replies.join("\n")}`).toBe(1);
    expect(bookings[0].check_in).toBe(newCi);
  });
});

describe("autonomous dining reservations", () => {
  const d = addDays(todayIsoDate(), 5);

  it("completes a dinner reservation across turns", async () => {
    const { replies } = await runConversation([
      "I'd like to book a table",
      "Le Jardin",
      `${d} at 7:30 PM`,
      "for 4 people",
      "name is Olivia Stone, phone 5559998888",
      "yes",
    ]);
    expect(replies[replies.length - 1].toLowerCase()).toMatch(/confirmed|all set|reservation #/);
  });

  it("rejects a time outside venue hours", async () => {
    const { replies } = await runConversation([
      `book a table at Le Jardin ${d} at 3 AM for 2, name is Tim Roth phone 5551231234`,
    ]);
    // Le Jardin: Breakfast 7-10:30, Dinner 6:30pm-11pm → 3 AM is closed
    expect(replies[0].toLowerCase()).toMatch(/isn't open|not open|hours/);
  });
});

describe("hotel Q&A — must not stall or give booking prompts", () => {
  const questions = [
    "what time is check in?",
    "what time is checkout?",
    "do you allow pets?",
    "is smoking allowed?",
    "how much is the deluxe room?",
    "what restaurants do you have?",
    "do you have a pool?",
    "is there a gym?",
    "how do I get to the hotel?",
    "where can I park?",
    "do you have airport shuttle?",
    "what's your cancellation policy?",
    "what amenities do you have?",
    "what's your phone number?",
  ];

  for (const q of questions) {
    it(`answers or routes "${q}" without a booking prompt`, async () => {
      const { replies } = await runConversation([q]);
      // These are info questions: either answered by AI fallthrough, never a booking date prompt
      expect(replies[0]).not.toMatch(/check-in and check-out dates\?/);
    });
  }
});
