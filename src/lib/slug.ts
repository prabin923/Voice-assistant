/** URL-safe tenant slug from hotel name. */
export function slugifyHotelName(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "hotel";
}

export function isValidHotelSlug(slug: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(slug);
}

export function normalizeHotelSlug(raw: string | null | undefined): string | undefined {
  const slug = raw?.trim().toLowerCase();
  if (!slug || !isValidHotelSlug(slug)) return undefined;
  return slug;
}
