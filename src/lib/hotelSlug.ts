import { hotels } from "@/lib/db";
import { isValidHotelSlug, normalizeHotelSlug, slugifyHotelName } from "@/lib/slug";

export async function generateUniqueHotelSlug(name: string): Promise<string> {
  const base = slugifyHotelName(name);
  let candidate = base;
  let n = 2;
  while (await hotels.findBySlug(candidate)) {
    const suffix = `-${n}`;
    candidate = `${base.slice(0, Math.max(1, 48 - suffix.length))}${suffix}`;
    n += 1;
  }
  return candidate;
}

export async function ensureHotelHasSlug(hotelId: string, fallbackName: string): Promise<string> {
  const hotel = await hotels.findById(hotelId);
  if (!hotel) throw new Error("Hotel not found");
  if (hotel.slug) return hotel.slug;
  const slug = await generateUniqueHotelSlug(fallbackName);
  await hotels.updateSlug(hotelId, slug);
  return slug;
}

export async function assignHotelSlug(
  hotelId: string,
  requestedSlug: string
): Promise<{ slug: string } | { error: string }> {
  const slug = normalizeHotelSlug(requestedSlug);
  if (!slug || !isValidHotelSlug(slug)) {
    return { error: "Slug must be 2–64 characters: lowercase letters, numbers, and hyphens." };
  }

  const existing = await hotels.findBySlug(slug);
  if (existing && existing.id !== hotelId) {
    return { error: "That URL slug is already taken." };
  }

  await hotels.updateSlug(hotelId, slug);
  return { slug };
}
