import { describe, expect, it } from "vitest";
import { DEFAULT_HOTEL_CONFIG } from "@/lib/hotelConfig";
import { normalizeHmsPayload } from "@/lib/hmsIntegration";

describe("normalizeHmsPayload", () => {
  it("maps common hotel management system fields into assistant config", () => {
    const result = normalizeHmsPayload({
      property: {
        name: "Summit View Hotel",
        phone: "+977-1-5550000",
        email: "stay@summit.test",
        city: "Kathmandu",
        country: "Nepal",
      },
      roomTypes: [
        {
          typeName: "Family Suite",
          baseRate: "180",
          currency: "usd",
          maxGuests: 4,
          description: "Two-bedroom suite for families.",
          amenities: ["Kitchenette", "Mountain view"],
        },
      ],
      facilities: [{ name: "Kids Club", hours: "9 AM - 6 PM", description: "Supervised activities." }],
      restaurants: [{ name: "Terrace Cafe", cuisine: "Nepali", openingHours: "7 AM - 10 PM" }],
      policies: { checkIn: "2 PM", checkOut: "12 PM" },
    }, DEFAULT_HOTEL_CONFIG);

    expect(result.updates.branding?.hotelName).toBe("Summit View Hotel");
    expect(result.updates.contact?.city).toBe("Kathmandu");
    expect(result.updates.rooms?.[0]).toMatchObject({
      name: "Family Suite",
      pricePerNight: 180,
      currency: "USD",
      maxOccupancy: 4,
    });
    expect(result.updates.amenities?.[0].name).toBe("Kids Club");
    expect(result.updates.dining?.[0].name).toBe("Terrace Cafe");
    expect(result.updates.policies?.checkInTime).toBe("2 PM");
    expect(result.counts.rooms).toBe(1);
    expect(result.counts.faq).toBeGreaterThan(0);
  });
});
