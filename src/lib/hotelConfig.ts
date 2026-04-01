// ============================================================
// UNIVERSAL HOTEL VOICE RECEPTIONIST — CONFIGURATION ENGINE
// ============================================================
// This file defines the hotel configuration schema and provides
// defaults. Any hotel can override these values via the admin
// settings panel or by editing the config directly.
// ============================================================

export interface RoomType {
  name: string;
  pricePerNight: number;
  currency: string;
  description: string;
  maxOccupancy: number;
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
  policies: HotelPolicy;
  rooms: RoomType[];
  dining: DiningVenue[];
  amenities: Amenity[];
  customFAQ: { question: string; answer: string }[];
  receptionistPersona: string; // System prompt personality
  language: string;
}

// ============================================================
// DEFAULT CONFIGURATION — Acts as a demo / template
// Hotels override this via the Settings panel at /settings
// ============================================================
export const DEFAULT_HOTEL_CONFIG: HotelConfig = {
  branding: {
    hotelName: "Your Hotel",
    tagline: "Virtual Receptionist AI",
    accentColor: "#f43f5e",    // rose-500
    welcomeMessage: "Welcome! How may I assist you with your stay today?",
    farewellMessage: "Thank you for choosing our hotel. Have a wonderful day!",
  },
  contact: {
    phone: "+1-555-0000",
    email: "frontdesk@yourhotel.com",
    website: "https://yourhotel.com",
    address: "123 Hotel Street",
    city: "Your City",
    country: "Your Country",
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
    { name: "Standard Room", pricePerNight: 120, currency: "USD", description: "Comfortable room with all essential amenities.", maxOccupancy: 2 },
    { name: "Deluxe Room", pricePerNight: 200, currency: "USD", description: "Spacious room with premium furnishings and a view.", maxOccupancy: 3 },
    { name: "Suite", pricePerNight: 350, currency: "USD", description: "Luxury suite with separate living area and premium amenities.", maxOccupancy: 4 },
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
  receptionistPersona: "You are a warm, professional, and highly courteous virtual hotel receptionist. You speak clearly and concisely. You always try to provide helpful answers and offer to connect the guest with a human agent when you cannot help.",
  language: "en",
};

// ============================================================
// CONFIG STORE — In-memory store for the current session.
// In production, this would be backed by a database.
// ============================================================
let currentConfig: HotelConfig = { ...DEFAULT_HOTEL_CONFIG };

export function getHotelConfig(): HotelConfig {
  return currentConfig;
}

export function updateHotelConfig(updates: Partial<HotelConfig>): HotelConfig {
  currentConfig = { ...currentConfig, ...updates };
  return currentConfig;
}

export function resetHotelConfig(): HotelConfig {
  currentConfig = { ...DEFAULT_HOTEL_CONFIG };
  return currentConfig;
}
