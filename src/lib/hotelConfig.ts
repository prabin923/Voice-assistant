// ============================================================
// UNIVERSAL HOTEL VOICE RECEPTIONIST — CONFIGURATION ENGINE
// ============================================================
// This file defines the hotel configuration schema and provides
// defaults. Any hotel can override these values via the admin
// settings panel or by editing the config directly.
// ============================================================

import { syncBrandingOnHotelRename } from "@/lib/hotelBrand";
import { sanitizeBranding } from "@/lib/brandingValidation";

export interface RoomType {
  name: string;
  pricePerNight: number;
  currency: string;
  description: string;
  maxOccupancy: number;
  /** Grouping used when guests ask for "categories" of rooms. */
  category?: string;
  /** Public URL (or local path like /icon.svg) used when rendering room images. */
  imageUrl?: string;
}

export interface DiningVenue {
  name: string;
  cuisine: string;
  hours: string;
  description: string;
}

export interface Amenity {
  name: string;
  description: string;
  hours?: string; // e.g. "24/7" or "6 AM - 10 PM"
}

export interface HotelPolicy {
  checkInTime: string;
  checkOutTime: string;
  cancellationPolicy: string;
  petPolicy: string;
  smokingPolicy: string;
  extraBedPolicy: string;
  childPolicy: string;
}

export interface ContactInfo {
  phone: string;
  email: string;
  website?: string;
  address: string;
  city: string;
  country: string;
}

export interface BrandingConfig {
  hotelName: string;
  tagline: string;
  accentColor: string;       // Tailwind-compatible or hex
  logoUrl?: string;
  welcomeMessage: string;
  farewellMessage: string;
}

export interface HotelConfig {
  branding: BrandingConfig;
  contact: ContactInfo;
  telephony?: {
    webhookUrl: string;
    enabled: boolean;
    provider: 'generic' | 'twilio' | 'telnyx';
    /** Telnyx TeXML voice string, e.g. "Telnyx.NaturalHD", "Polly.Amy-Neural" */
    telnyxVoice?: string;
    /** Phone number(s) associated with this app in Telnyx dashboard */
    telnyxPhoneNumber?: string;
  };
  policies: HotelPolicy;
  rooms: RoomType[];
  dining: DiningVenue[];
  amenities: Amenity[];
  customFAQ: { question: string; answer: string }[];
  receptionistPersona: string; // System prompt personality
  voiceStyle?: "warm" | "professional" | "energetic";
  language: string;
  supportedLanguages: string[]; // BCP-47 codes the hotel wants to support
}

// ============================================================
// DEFAULT CONFIGURATION — Acts as a demo / template
// Hotels override this via the Settings panel at /settings
// ============================================================
export const DEFAULT_HOTEL_CONFIG: HotelConfig = {
  branding: {
    hotelName: "Aurelian Grand",
    tagline: "Where Elegance Meets Serenity",
    accentColor: "#c9a96e",
    welcomeMessage: "Welcome to Aurelian Grand! How can I assist you with your stay today?",
    farewellMessage: "Thank you for choosing Aurelian Grand. Have a wonderful day!",
  },
  telephony: {
    webhookUrl: "/api/telephony/telnyx",
    enabled: true,
    provider: 'telnyx',
    telnyxVoice: "Telnyx.NaturalHD",
    telnyxPhoneNumber: "",
  },
  contact: {
    phone: "+377 97 77 0000",
    email: "reservations@aureliangrand.com",
    website: "https://aureliangrand.com",
    address: "1 Royal Marina Drive",
    city: "Monaco",
    country: "Monaco",
  },
  policies: {
    checkInTime: "3:00 PM",
    checkOutTime: "11:00 AM",
    cancellationPolicy: "Free cancellation up to 24 hours before check-in. Late cancellations may incur a one-night charge.",
    petPolicy: "Pets are welcome with a refundable deposit. Please inform the front desk in advance.",
    smokingPolicy: "All indoor areas are non-smoking. Designated smoking areas are available outdoors.",
    extraBedPolicy: "Extra beds are available upon request at an additional charge, subject to availability.",
    childPolicy: "Children under 12 stay free when using existing bedding. Cribs are available upon request.",
  },
  rooms: [
    {
      name: "Deluxe King Room",
      category: "Deluxe",
      imageUrl: "https://picsum.photos/seed/aurelian-deluxe-room/600/400",
      pricePerNight: 320,
      currency: "USD",
      description: "Spacious retreat with ocean views, king-size bed, and premium amenities.",
      maxOccupancy: 2,
    },
    {
      name: "Grand Suite",
      category: "Suite",
      imageUrl: "https://picsum.photos/seed/aurelian-grand-suite/600/400",
      pricePerNight: 580,
      currency: "USD",
      description: "An 80m² masterpiece with separate living area, skyline views, and butler service.",
      maxOccupancy: 3,
    },
    {
      name: "Royal Penthouse",
      category: "Penthouse",
      imageUrl: "https://picsum.photos/seed/aurelian-penthouse/600/400",
      pricePerNight: 1200,
      currency: "USD",
      description: "The pinnacle of luxury with private terrace, hot tub, and personal chef on call.",
      maxOccupancy: 4,
    },
  ],
  dining: [
    { name: "Le Jardin", cuisine: "Fine Dining", hours: "Breakfast 7:00 AM - 10:30 AM, Dinner 6:30 PM - 11:00 PM", description: "Michelin-starred dining with seasonal tasting menus." },
    { name: "Marina Lounge", cuisine: "Cocktails & Light Bites", hours: "Open 24/7", description: "Rooftop lounge with panoramic Mediterranean views." },
  ],
  amenities: [
    { name: "Swimming Pool", description: "Indoor heated pool for guests.", hours: "6 AM - 10 PM" },
    { name: "Fitness Center", description: "Fully equipped gym.", hours: "24/7" },
    { name: "Spa & Wellness", description: "Full-service spa offering massage, facial, and body treatments." },
    { name: "Wi-Fi", description: "Complimentary high-speed Wi-Fi available throughout the property." },
    { name: "Parking", description: "Valet and self-parking options available." },
    { name: "Business Center", description: "Meeting rooms and business facilities available for corporate guests." },
  ],
  customFAQ: [
    { question: "airport shuttle", answer: "We offer complimentary airport shuttle service. Please contact the front desk to arrange your pickup." },
    { question: "laundry", answer: "Laundry and dry cleaning services are available. Please check the in-room menu card for pricing and pickup times." },
  ],
  receptionistPersona: "You are Alex, the front-desk concierge — warm, calm, and fully autonomous. You know everything about this hotel and can complete room bookings and restaurant reservations without transferring to staff. You speak in natural, conversational sentences (never robotic lists). You answer any guest question from hotel facts, and you never say you cannot help with bookings or dining.",
  voiceStyle: "warm",
  language: "en-US",
  supportedLanguages: ["en-US", "es-ES", "fr-FR", "de-DE", "ja-JP", "zh-CN", "hi-IN", "ne-NP", "ko-KR", "ar-SA", "pt-BR", "ru-RU", "it-IT", "tr-TR", "th-TH", "vi-VN", "id-ID", "nl-NL", "pl-PL", "sv-SE"],
};

import { hotels, ensureDbReady } from "./db";
import { syncInventoryFromConfig } from "./inventorySync";
import {
  getTenantConfig,
  invalidateTenantConfigCache,
  resolveTenantConfig,
  runWithTenant,
} from "@/lib/tenantContext";

// ============================================================
// CONFIG STORE — In-memory cache; persisted via ensureHotelConfigLoaded().
// ============================================================
let currentConfig: HotelConfig | null = null;
let loadPromise: Promise<HotelConfig> | null = null;

export async function ensureHotelConfigLoaded(options?: {
  slug?: string | null;
  hotelId?: string | null;
}): Promise<HotelConfig> {
  if (options?.slug || options?.hotelId) {
    const store = await resolveTenantConfig(options);
    return store.config;
  }

  if (currentConfig) return currentConfig;
  if (!loadPromise) {
    loadPromise = (async () => {
      const store = await resolveTenantConfig({});
      currentConfig = store.config;
      await syncInventoryFromConfig(currentConfig);
      const { scheduleKnowledgeSync } = await import("@/lib/rag/knowledgeIndex");
      scheduleKnowledgeSync(currentConfig);
      return currentConfig;
    })();
  }
  return loadPromise;
}

export { runWithTenant };

export function getHotelConfig(): HotelConfig {
  const tenant = getTenantConfig();
  if (tenant !== DEFAULT_HOTEL_CONFIG || currentConfig) {
    return tenant;
  }
  return currentConfig ?? DEFAULT_HOTEL_CONFIG;
}

export async function updateHotelConfig(
  updates: Partial<HotelConfig>,
  hotelId?: string
): Promise<HotelConfig> {
  const config = hotelId
    ? await ensureHotelConfigLoaded({ hotelId })
    : await ensureHotelConfigLoaded();

  const prevHotelName = config.branding.hotelName;
  const nextHotelName = updates.branding?.hotelName ?? prevHotelName;

  const updated: HotelConfig = {
    ...config,
    ...updates,
    branding: { ...config.branding, ...(updates.branding ?? {}) },
    contact: { ...config.contact, ...(updates.contact ?? {}) },
    policies: { ...config.policies, ...(updates.policies ?? {}) },
  };

  if (updates.branding?.hotelName && nextHotelName !== prevHotelName) {
    updated.branding = syncBrandingOnHotelRename(prevHotelName, nextHotelName, updated.branding);
  }

  updated.branding = sanitizeBranding(updated.branding);

  currentConfig = updated;
  try {
    const { invalidateResponseEngineCache } = await import("@/lib/responseEngine");
    invalidateResponseEngineCache();
  } catch {
    /* response engine optional at bootstrap */
  }

  // Persist to DB for the authenticated hotel (or first hotel in single-tenant mode)
  try {
    const hotel = hotelId
      ? await hotels.findById(hotelId)
      : await hotels.getFirst();
    if (hotel) {
      await hotels.updateConfig(hotel.id, JSON.stringify(updated));
      invalidateTenantConfigCache(hotel.slug ?? undefined, hotel.id);
    }
  } catch (e) {
    console.error("Failed to persist config to DB:", e);
  }

  await syncInventoryFromConfig(updated);
  const { scheduleKnowledgeSync } = await import("@/lib/rag/knowledgeIndex");
  scheduleKnowledgeSync(updated);
  return updated;
}

export async function resetHotelConfig(hotelId?: string): Promise<HotelConfig> {
  currentConfig = { ...DEFAULT_HOTEL_CONFIG };

  try {
    const hotel = hotelId
      ? await hotels.findById(hotelId)
      : await hotels.getFirst();
    if (hotel) {
      await hotels.updateConfig(hotel.id, JSON.stringify(currentConfig));
      invalidateTenantConfigCache(hotel.slug ?? undefined, hotel.id);
    }
  } catch (e) {
    console.error("Failed to reset config in DB:", e);
  }

  await syncInventoryFromConfig(currentConfig);
  const { scheduleKnowledgeSync } = await import("@/lib/rag/knowledgeIndex");
  scheduleKnowledgeSync(currentConfig);
  return currentConfig;
}
