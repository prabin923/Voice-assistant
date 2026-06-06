import { availability } from "@/lib/db";
import type { HotelConfig } from "@/lib/hotelConfig";

/** Ensure inventory defaults exist for every configured room type (default count: 5). */
export async function syncInventoryFromConfig(config: HotelConfig) {
  for (const room of config.rooms) {
    const name = room.name?.trim();
    if (!name) continue;
    if (!(await availability.hasDefault(name))) {
      await availability.setDefault(name, 5);
    }
  }
}
