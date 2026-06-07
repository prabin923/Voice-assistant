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
    hotelName: "Willow Hotel",
    tagline: "Your 24/7 Virtual AI Receptionist",
    accentColor: "#c9a227",    // StayNEP gold
    welcomeMessage: "Welcome to Willow Hotel! How can I assist you with your stay today?",
    farewellMessage: "Thank you for choosing Willow Hotel. Have a wonderful day!",
  },
  telephony: {
    webhookUrl: "/api/telephony/telnyx",
    enabled: true,
    provider: 'telnyx',
    telnyxVoice: "Telnyx.NaturalHD",
    telnyxPhoneNumber: "",
  },
  contact: {
    phone: "+977-9811002233", // Customizable phone number
    email: "frontdesk@willowhotel.com",
    website: "https://willowhotel.com.np",
    address: "Lakeside Street, Ward 6",
    city: "Pokhara",
    country: "Nepal",
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
      name: "Standard Room",
      category: "Classic",
      imageUrl: "https://picsum.photos/seed/willow-standard-room/600/400",
      pricePerNight: 120,
      currency: "USD",
      description: "Comfortable room with all essential amenities.",
      maxOccupancy: 2,
    },
    {
      name: "Deluxe Room",
      category: "Premium",
      imageUrl: "https://picsum.photos/seed/willow-deluxe-room/600/400",
      pricePerNight: 200,
      currency: "USD",
      description: "Spacious room with premium furnishings and a view.",
      maxOccupancy: 3,
    },
    {
      name: "Suite",
      category: "Luxury",
      imageUrl: "https://picsum.photos/seed/willow-suite-room/600/400",
      pricePerNight: 350,
      currency: "USD",
      description: "Luxury suite with separate living area and premium amenities.",
      maxOccupancy: 4,
    },
  ],
  dining: [
    { name: "Main Restaurant", cuisine: "International", hours: "Breakfast 6:30 AM - 10:30 AM, Dinner 6:00 PM - 10:00 PM", description: "Our signature dining experience." },
    { name: "Lobby Café", cuisine: "Light Bites & Beverages", hours: "Open 24/7", description: "Quick snacks and refreshments available around the clock." },
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
  receptionistPersona: "You are Alex, the front-desk concierge — warm, calm, and genuinely helpful, like a trusted hotel host who knows every guest by name. You speak in natural, conversational sentences (never robotic lists). You acknowledge feelings, use contractions, and sound like you're smiling when you greet someone.",
  voiceStyle: "warm",
  language: "en-US",
  supportedLanguages: ["en-US", "es-ES", "fr-FR", "de-DE", "ja-JP", "zh-CN", "hi-IN", "ne-NP", "ko-KR", "ar-SA", "pt-BR", "ru-RU", "it-IT", "tr-TR", "th-TH", "vi-VN", "id-ID", "nl-NL", "pl-PL", "sv-SE"],
};

import { hotels, ensureDbReady } from "./db";
import { syncInventoryFromConfig } from "./inventorySync";

// ============================================================
// CONFIG STORE — In-memory cache; persisted via ensureHotelConfigLoaded().
// ============================================================
let currentConfig: HotelConfig | null = null;
let loadPromise: Promise<HotelConfig> | null = null;

export async function ensureHotelConfigLoaded(): Promise<HotelConfig> {
  if (currentConfig) return currentConfig;
  if (!loadPromise) {
    loadPromise = (async () => {
      await ensureDbReady();
      try {
        const hotel = await hotels.getFirst();
        if (hotel?.config && hotel.config !== "{}") {
          currentConfig = JSON.parse(hotel.config) as HotelConfig;
        } else {
          currentConfig = { ...DEFAULT_HOTEL_CONFIG };
        }
      } catch (e) {
        console.error("Failed to load config from DB:", e);
        currentConfig = { ...DEFAULT_HOTEL_CONFIG };
      }
      await syncInventoryFromConfig(currentConfig);
      return currentConfig;
    })();
  }
  return loadPromise;
}

export function getHotelConfig(): HotelConfig {
  return currentConfig ?? DEFAULT_HOTEL_CONFIG;
}

export async function updateHotelConfig(updates: Partial<HotelConfig>): Promise<HotelConfig> {
  const config = await ensureHotelConfigLoaded();

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

  // Persist to DB (for the first hotel found)
  try {
    const hotel = await hotels.getFirst();
    if (hotel) {
      await hotels.updateConfig(hotel.id, JSON.stringify(updated));
    }
  } catch (e) {
    console.error("Failed to persist config to DB:", e);
  }

  await syncInventoryFromConfig(updated);
  return updated;
}

export async function resetHotelConfig(): Promise<HotelConfig> {
  currentConfig = { ...DEFAULT_HOTEL_CONFIG };

  try {
    const hotel = await hotels.getFirst();
    if (hotel) {
      await hotels.updateConfig(hotel.id, JSON.stringify(currentConfig));
    }
  } catch (e) {
    console.error("Failed to reset config in DB:", e);
  }

  await syncInventoryFromConfig(currentConfig);
  return currentConfig;
}
