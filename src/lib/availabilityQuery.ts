import { availability } from "@/lib/db";
import type { HotelConfig } from "@/lib/hotelConfig";
import { addDays } from "@/lib/dateParsing";

export type RoomAvailabilityRow = {
  roomType: string;
  available: number;
  pricePerNight: number;
  currency: string;
  maxOccupancy: number;
  category?: string;
  description?: string;
};

export async function getAvailabilitySnapshot(
  config: HotelConfig,
  checkIn: string,
  checkOut: string
): Promise<RoomAvailabilityRow[]> {
  return Promise.all(
    config.rooms.map(async (room) => {
      const summary = await availability.get(room.name, checkIn, checkOut);
      return {
        roomType: room.name,
        available: summary.available,
        pricePerNight: room.pricePerNight,
        currency: room.currency,
        maxOccupancy: room.maxOccupancy,
        category: room.category,
        description: room.description,
      };
    })
  );
}

export type AvailabilityAlternative = {
  roomType: string;
  checkIn: string;
  checkOut: string;
  available: number;
  kind: "other_room" | "shift_dates";
};

export async function suggestAlternatives(
  config: HotelConfig,
  checkIn: string,
  checkOut: string,
  preferredRoomType?: string,
  maxResults = 4
): Promise<AvailabilityAlternative[]> {
  const results: AvailabilityAlternative[] = [];
  const snapshot = await getAvailabilitySnapshot(config, checkIn, checkOut);

  for (const row of snapshot) {
    if (preferredRoomType && row.roomType === preferredRoomType) continue;
    if (row.available > 0) {
      results.push({
        roomType: row.roomType,
        checkIn,
        checkOut,
        available: row.available,
        kind: "other_room",
      });
    }
  }

  if (preferredRoomType) {
    const shiftChecks = [-1, 1, -2, 2].map(async (offset) => {
      const altIn = addDays(checkIn, offset);
      const altOut = addDays(checkOut, offset);
      if (altIn < todayIso()) return null;
      const altSnap = await availability.get(preferredRoomType, altIn, altOut);
      if (altSnap.available <= 0) return null;
      return {
        roomType: preferredRoomType,
        checkIn: altIn,
        checkOut: altOut,
        available: altSnap.available,
        kind: "shift_dates" as const,
      };
    });
    const shifted = (await Promise.all(shiftChecks)).filter(Boolean) as AvailabilityAlternative[];
    results.push(...shifted);
  }

  return results.slice(0, maxResults);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Scan the next `daysAhead` days and return the first contiguous window
 *  where `roomType` has at least `minRooms` free for `stayNights` nights.
 *  Returns up to `maxResults` such windows. */
export async function findNextAvailableWindows(
  config: HotelConfig,
  roomType: string,
  stayNights: number,
  options?: { minRooms?: number; daysAhead?: number; maxResults?: number }
): Promise<Array<{ checkIn: string; checkOut: string; available: number }>> {
  const minRooms = options?.minRooms ?? 1;
  const daysAhead = options?.daysAhead ?? 60;
  const maxResults = options?.maxResults ?? 3;

  const results: Array<{ checkIn: string; checkOut: string; available: number }> = [];
  let cursor = todayIso();

  for (let i = 0; i < daysAhead && results.length < maxResults; i++) {
    const checkIn = cursor;
    const checkOut = addDays(checkIn, stayNights);
    const snap = await availability.get(roomType, checkIn, checkOut);
    if (snap.available >= minRooms) {
      results.push({ checkIn, checkOut, available: snap.available });
      // Jump past this window to find non-overlapping alternatives
      i += stayNights - 1;
      cursor = addDays(checkOut, 1);
    } else {
      cursor = addDays(cursor, 1);
    }
  }
  return results;
}

/** Format a list of available windows into a natural sentence. */
export function formatAvailableWindows(
  roomType: string,
  windows: Array<{ checkIn: string; checkOut: string; available: number }>,
  stayNights: number
): string {
  if (!windows.length) {
    return `I checked the next 60 days and the ${roomType} is fully booked for ${stayNights}-night stays. Would you like to try a different room type or a shorter stay?`;
  }
  const parts = windows.map(
    (w) => `${w.checkIn} to ${w.checkOut} (${w.available} room${w.available !== 1 ? "s" : ""} available)`
  );
  return `The ${roomType} is available for ${stayNights} night${stayNights !== 1 ? "s" : ""} on: ${parts.join("; ")}. Would you like me to book one of these?`;
}

export function formatAvailabilityList(rows: RoomAvailabilityRow[], checkIn: string, checkOut: string): string {
  const available = rows.filter((r) => r.available > 0);
  if (!available.length) {
    return `We're fully booked from ${checkIn} to ${checkOut}. I can suggest other dates or room types if you'd like.`;
  }
  const list = available
    .slice(0, 6)
    .map(
      (r) =>
        `${r.roomType} (${r.available} available, ${r.currency}${r.pricePerNight}/night, up to ${r.maxOccupancy} guests)`
    )
    .join("; ");
  return `For ${checkIn} to ${checkOut}: ${list}. Would you like to book one of these?`;
}

export function formatAlternativeSuggestions(alternatives: AvailabilityAlternative[]): string {
  if (!alternatives.length) {
    return "I couldn't find nearby alternatives automatically. Would you like to try different dates?";
  }
  const parts = alternatives.map((alt) => {
    if (alt.kind === "shift_dates") {
      return `${alt.roomType} on ${alt.checkIn} to ${alt.checkOut} (${alt.available} available)`;
    }
    return `${alt.roomType} on the same dates (${alt.available} available)`;
  });
  return `Here are some options: ${parts.join("; ")}. Which would you prefer?`;
}
