import prisma from "@/lib/prisma";

export interface GuestPreferences {
  roomTemperature?: string; // e.g. "72°F / 22°C"
  pillowType?: string;      // e.g. "Feather", "Memory Foam"
  dietaryRestrictions?: string[]; // e.g. ["Vegan", "Gluten-Free"]
  minibarPreferences?: string[];  // e.g. ["Sparkling Water", "No Alcohol"]
  accessibilityNeeds?: string;    // e.g. "Wheelchair access"
}

export async function getGuestPreferences(guestId: string): Promise<GuestPreferences> {
  const guest = await prisma.guest.findUnique({
    where: { id: guestId },
    select: { preferences: true },
  });
  if (!guest) return {};
  try {
    return JSON.parse(guest.preferences || "{}") as GuestPreferences;
  } catch {
    return {};
  }
}

export async function updateGuestPreferences(guestId: string, prefs: GuestPreferences): Promise<GuestPreferences> {
  const current = await getGuestPreferences(guestId);
  const updated = { ...current, ...prefs };
  await prisma.guest.update({
    where: { id: guestId },
    data: { preferences: JSON.stringify(updated) },
  });
  return updated;
}

export async function guestPreferencesPromptFragment(guestId: string): Promise<string> {
  const prefs = await getGuestPreferences(guestId);
  const fragments: string[] = [];

  if (prefs.roomTemperature) {
    fragments.push(`prefers room temperature set to ${prefs.roomTemperature}`);
  }
  if (prefs.pillowType) {
    fragments.push(`prefers ${prefs.pillowType} pillows`);
  }
  if (prefs.dietaryRestrictions && prefs.dietaryRestrictions.length > 0) {
    fragments.push(`has dietary restrictions: ${prefs.dietaryRestrictions.join(", ")}`);
  }
  if (prefs.minibarPreferences && prefs.minibarPreferences.length > 0) {
    fragments.push(`prefers minibar stocked with: ${prefs.minibarPreferences.join(", ")}`);
  }
  if (prefs.accessibilityNeeds) {
    fragments.push(`has accessibility needs: ${prefs.accessibilityNeeds}`);
  }

  if (fragments.length === 0) return "";
  return `Guest profile preferences: The guest ${fragments.join("; ")}. Keep these preferences in mind when booking rooms, ordering room service, or scheduling spa services.`;
}
