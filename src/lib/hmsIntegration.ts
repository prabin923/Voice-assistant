import type { Amenity, DiningVenue, HotelConfig, RoomType, SpaService } from "@/lib/hotelConfig";

export type HmsNormalizedImport = {
  updates: Partial<HotelConfig>;
  counts: {
    rooms: number;
    amenities: number;
    dining: number;
    spa: number;
    faq: number;
  };
};

type UnknownRecord = Record<string, unknown>;

const PRIVATE_HOSTS = [/^localhost$/i, /^127\./, /^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[0-1])\./];

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : null;
}

function firstString(record: UnknownRecord | null, keys: string[], fallback = ""): string {
  if (!record) return fallback;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return fallback;
}

function firstNumber(record: UnknownRecord | null, keys: string[], fallback = 0): number {
  if (!record) return fallback;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) return Number(value);
  }
  return fallback;
}

function firstArray(record: UnknownRecord | null, keys: string[]): unknown[] {
  if (!record) return [];
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function textList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      const record = asRecord(item);
      return firstString(record, ["name", "title", "label"]);
    })
    .filter(Boolean);
}

function rootPayload(payload: unknown): UnknownRecord {
  const root = asRecord(payload) ?? {};
  return asRecord(root.data) ?? root;
}

function normalizeRoom(value: unknown): RoomType | null {
  const record = asRecord(value);
  if (!record) return null;
  const name = firstString(record, ["name", "roomType", "typeName", "title", "code"]);
  if (!name) return null;

  const imageUrl = firstString(record, ["imageUrl", "image", "photoUrl"]);
  const photos = firstArray(record, ["images", "photos"]);
  const firstPhoto = typeof photos[0] === "string" ? photos[0] : firstString(asRecord(photos[0]), ["url", "src"]);

  return {
    name,
    pricePerNight: firstNumber(record, ["pricePerNight", "baseRate", "rate", "price", "amount"], 0),
    currency: firstString(record, ["currency", "currencyCode"], "USD").toUpperCase(),
    description: firstString(record, ["description", "summary", "details"], `${name} at the hotel.`),
    maxOccupancy: Math.max(1, firstNumber(record, ["maxOccupancy", "occupancy", "maxGuests", "capacity"], 2)),
    category: firstString(record, ["category", "class", "roomClass"]) || undefined,
    imageUrl: imageUrl || firstPhoto || undefined,
    amenitiesIncluded: textList(record.amenitiesIncluded ?? record.amenities ?? record.features),
  };
}

function normalizeAmenity(value: unknown): Amenity | null {
  if (typeof value === "string") return { name: value.trim(), description: `${value.trim()} is available at the hotel.` };
  const record = asRecord(value);
  if (!record) return null;
  const name = firstString(record, ["name", "title", "facilityName", "label"]);
  if (!name) return null;
  return {
    name,
    description: firstString(record, ["description", "summary", "details"], `${name} is available at the hotel.`),
    hours: firstString(record, ["hours", "openingHours", "schedule"]) || undefined,
  };
}

function normalizeDining(value: unknown): DiningVenue | null {
  const record = asRecord(value);
  if (!record) return null;
  const name = firstString(record, ["name", "title", "venueName", "restaurantName"]);
  if (!name) return null;
  return {
    name,
    cuisine: firstString(record, ["cuisine", "type", "category"], "Dining"),
    hours: firstString(record, ["hours", "openingHours", "schedule"], "Ask the front desk for current hours."),
    description: firstString(record, ["description", "summary", "details"], `${name} is available for hotel guests.`),
  };
}

function normalizeSpa(value: unknown): SpaService | null {
  const record = asRecord(value);
  if (!record) return null;
  const name = firstString(record, ["name", "title", "serviceName", "treatmentName"]);
  if (!name) return null;
  return {
    name,
    durationMinutes: Math.max(1, firstNumber(record, ["durationMinutes", "duration", "minutes"], 60)),
    price: firstNumber(record, ["price", "amount", "rate"], 0),
    currency: firstString(record, ["currency", "currencyCode"], "USD").toUpperCase(),
    description: firstString(record, ["description", "summary", "details"], `${name} is available through the spa.`),
  };
}

function normalizeFaq(value: unknown): { question: string; answer: string } | null {
  const record = asRecord(value);
  if (!record) return null;
  const question = firstString(record, ["question", "q", "keyword", "title"]);
  const answer = firstString(record, ["answer", "a", "response", "description"]);
  return question && answer ? { question, answer } : null;
}

function decisionFaqs(rooms: RoomType[], amenities: Amenity[], dining: DiningVenue[], spa: SpaService[]) {
  const faqs: { question: string; answer: string }[] = [];
  if (rooms.length > 1) {
    const roomSummary = rooms
      .slice(0, 6)
      .map((room) => `${room.name} is best for up to ${room.maxOccupancy} guest${room.maxOccupancy === 1 ? "" : "s"} at ${room.currency}${room.pricePerNight}/night: ${room.description}`)
      .join(" ");
    faqs.push({
      question: "Which room should I choose?",
      answer: `Help the guest choose based on party size, budget, view, and comfort needs. ${roomSummary}`,
    });
  }
  const facilityParts = [
    amenities.length ? `Amenities: ${amenities.map((item) => item.name).join(", ")}.` : "",
    dining.length ? `Dining: ${dining.map((item) => `${item.name} (${item.cuisine})`).join(", ")}.` : "",
    spa.length ? `Spa: ${spa.map((item) => item.name).join(", ")}.` : "",
  ].filter(Boolean);
  if (facilityParts.length) {
    faqs.push({
      question: "Which hotel facilities are best for me?",
      answer: `Ask whether the guest is traveling for family, business, wellness, dining, or convenience, then recommend relevant facilities. ${facilityParts.join(" ")}`,
    });
  }
  return faqs;
}

export function normalizeHmsPayload(payload: unknown, current: HotelConfig): HmsNormalizedImport {
  const root = rootPayload(payload);
  const hotel = asRecord(root.hotel) ?? asRecord(root.property) ?? root;

  const rooms = firstArray(root, ["rooms", "roomTypes", "accommodations", "units"]).map(normalizeRoom).filter(Boolean) as RoomType[];
  const amenities = firstArray(root, ["amenities", "facilities", "services"]).map(normalizeAmenity).filter(Boolean) as Amenity[];
  const dining = firstArray(root, ["dining", "diningVenues", "restaurants", "outlets"]).map(normalizeDining).filter(Boolean) as DiningVenue[];
  const spa = firstArray(root, ["spa", "spaServices", "wellness", "treatments"]).map(normalizeSpa).filter(Boolean) as SpaService[];
  const faq = firstArray(root, ["customFAQ", "faq", "faqs", "knowledgeBase"]).map(normalizeFaq).filter(Boolean) as { question: string; answer: string }[];

  const policies = asRecord(root.policies);
  const operations = asRecord(root.operations ?? root.hours);

  const updates: Partial<HotelConfig> = {
    branding: {
      ...current.branding,
      hotelName: firstString(hotel, ["hotelName", "name", "propertyName"], current.branding.hotelName),
      tagline: firstString(hotel, ["tagline", "slogan"], current.branding.tagline),
      welcomeMessage: firstString(hotel, ["welcomeMessage"], current.branding.welcomeMessage),
      farewellMessage: firstString(hotel, ["farewellMessage"], current.branding.farewellMessage),
    },
    contact: {
      ...current.contact,
      phone: firstString(hotel, ["phone", "telephone"], current.contact.phone),
      email: firstString(hotel, ["email", "reservationEmail"], current.contact.email),
      website: firstString(hotel, ["website", "url"], current.contact.website),
      address: firstString(hotel, ["address", "streetAddress"], current.contact.address),
      city: firstString(hotel, ["city"], current.contact.city),
      country: firstString(hotel, ["country"], current.contact.country),
      directions: firstString(hotel, ["directions"], current.contact.directions),
      parkingInfo: firstString(hotel, ["parkingInfo", "parking"], current.contact.parkingInfo),
      airportShuttle: firstString(hotel, ["airportShuttle", "airportTransfer", "shuttle"], current.contact.airportShuttle),
    },
    policies: {
      ...current.policies,
      checkInTime: firstString(policies, ["checkInTime", "checkIn"], current.policies.checkInTime),
      checkOutTime: firstString(policies, ["checkOutTime", "checkOut"], current.policies.checkOutTime),
      cancellationPolicy: firstString(policies, ["cancellationPolicy", "cancellation"], current.policies.cancellationPolicy),
      petPolicy: firstString(policies, ["petPolicy", "pets"], current.policies.petPolicy),
      smokingPolicy: firstString(policies, ["smokingPolicy", "smoking"], current.policies.smokingPolicy),
      extraBedPolicy: firstString(policies, ["extraBedPolicy", "extraBed"], current.policies.extraBedPolicy),
      childPolicy: firstString(policies, ["childPolicy", "children"], current.policies.childPolicy),
      earlyCheckIn: firstString(policies, ["earlyCheckIn"], current.policies.earlyCheckIn),
      lateCheckout: firstString(policies, ["lateCheckout"], current.policies.lateCheckout),
    },
    operations: {
      ...(current.operations ?? {}),
      frontDeskHours: firstString(operations, ["frontDeskHours", "frontDesk"], current.operations?.frontDeskHours),
      conciergeHours: firstString(operations, ["conciergeHours", "concierge"], current.operations?.conciergeHours),
      housekeepingHours: firstString(operations, ["housekeepingHours", "housekeeping"], current.operations?.housekeepingHours),
      roomServiceHours: firstString(operations, ["roomServiceHours", "roomService"], current.operations?.roomServiceHours),
    },
  };

  if (rooms.length) updates.rooms = rooms;
  if (amenities.length) updates.amenities = amenities;
  if (dining.length) updates.dining = dining;
  if (spa.length) updates.spa = spa;
  const importedFaq = [...faq, ...decisionFaqs(rooms, amenities, dining, spa)];
  if (importedFaq.length) updates.customFAQ = [...current.customFAQ, ...importedFaq];

  return {
    updates,
    counts: {
      rooms: rooms.length,
      amenities: amenities.length,
      dining: dining.length,
      spa: spa.length,
      faq: importedFaq.length,
    },
  };
}

export function validateHmsEndpoint(rawUrl: string): URL {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("HMS endpoint must be an HTTP or HTTPS URL.");
  }
  if (process.env.NODE_ENV === "production" && PRIVATE_HOSTS.some((pattern) => pattern.test(url.hostname))) {
    throw new Error("Private HMS endpoints are not allowed in production.");
  }
  return url;
}
