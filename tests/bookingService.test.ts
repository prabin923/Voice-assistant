/**
 * Booking service — validation, transactional create, cancel
 */

import { describe, it, expect, beforeEach } from "vitest";
import { bookings, availability } from "@/lib/db";
import {
  cancelBookingSafe,
  createBookingSafe,
  isIsoDate,
  validateRoomType,
} from "@/lib/bookingService";
import { getHotelConfig } from "@/lib/hotelConfig";

function uniqueDateRange(offset = 0): { checkIn: string; checkOut: string } {
  const day = 1 + ((Date.now() + offset) % 20);
  const month = 3 + ((Date.now() + offset) % 6);
  const checkIn = `2028-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const checkOut = `2028-${String(month).padStart(2, "0")}-${String(day + 2).padStart(2, "0")}`;
  return { checkIn, checkOut };
}

describe("bookingService", () => {
  beforeEach(async () => {
    const config = getHotelConfig();
    const roomType = config.rooms[0]?.name ?? "Standard Room";
    await availability.setDefault(roomType, 2);
  });

  it("validates ISO dates", () => {
    expect(isIsoDate("2026-06-01")).toBe(true);
    expect(isIsoDate("06-01-2026")).toBe(false);
  });

  it("rejects invalid room types", () => {
    const config = getHotelConfig();
    const valid = config.rooms[0]?.name ?? "Standard Room";
    expect(validateRoomType(valid, config)).toBe(true);
    expect(validateRoomType("Nonexistent Suite", config)).toBe(false);
  });

  it("creates a booking when inventory allows", async () => {
    const config = getHotelConfig();
    const roomType = config.rooms[0]?.name ?? "Standard Room";
    await availability.setDefault(roomType, 3);
    const { checkIn, checkOut } = uniqueDateRange(0);

    const result = await createBookingSafe({
      roomType,
      checkIn,
      checkOut,
      guestName: "Test Guest",
      guestPhone: "+15551234567",
      guestEmail: "guest@example.com",
      rooms: 1,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.booking.room_type).toBe(roomType);
      expect(result.booking.status).toBe("confirmed");
    }
  });

  it("rejects overbooking via transactional create", async () => {
    const config = getHotelConfig();
    const roomType = config.rooms[0]?.name ?? "Standard Room";
    await availability.setDefault(roomType, 1);

    const { checkIn, checkOut } = uniqueDateRange(1000);

    const first = await createBookingSafe({
      roomType,
      checkIn,
      checkOut,
      guestName: "Guest One",
      guestPhone: "+15551111111",
      rooms: 1,
    });
    expect(first.ok).toBe(true);

    const second = await createBookingSafe({
      roomType,
      checkIn,
      checkOut,
      guestName: "Guest Two",
      guestPhone: "+15552222222",
      rooms: 1,
    });
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.status).toBe(409);
    }
  });

  it("cancels a confirmed booking", async () => {
    const config = getHotelConfig();
    const roomType = config.rooms[0]?.name ?? "Standard Room";
    const { checkIn, checkOut } = uniqueDateRange(2000);
    const created = await createBookingSafe({
      roomType,
      checkIn,
      checkOut,
      guestName: "Cancel Me",
      guestPhone: "+15553333333",
      rooms: 1,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const cancelled = await cancelBookingSafe(created.booking.id);
    expect(cancelled.ok).toBe(true);
    if (cancelled.ok) {
      expect(cancelled.booking.status).toBe("cancelled");
    }

    const row = await bookings.getById(created.booking.id);
    expect(row?.status).toBe("cancelled");
  });
});
