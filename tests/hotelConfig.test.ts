/**
 * ============================================================
 * TEST SUITE: Hotel Configuration — lib/hotelConfig.ts
 * ============================================================
 * Tests for the hotel config engine: defaults, updates, resets.
 * These test the pure config logic without DB dependencies.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_HOTEL_CONFIG,
  type HotelConfig,
  type RoomType,
  type BrandingConfig,
  type ContactInfo,
  type HotelPolicy,
} from '@/lib/hotelConfig';

describe('Hotel Config — Default Configuration', () => {

  it('TC-4.1: Default config should have correct hotel name', () => {
    expect(DEFAULT_HOTEL_CONFIG.branding.hotelName).toBe('Willow Hotel');
  });

  it('should have valid accent color hex', () => {
    expect(DEFAULT_HOTEL_CONFIG.branding.accentColor).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('should have at least 3 room types', () => {
    expect(DEFAULT_HOTEL_CONFIG.rooms.length).toBeGreaterThanOrEqual(3);
  });

  it('room prices should be positive numbers', () => {
    for (const room of DEFAULT_HOTEL_CONFIG.rooms) {
      expect(room.pricePerNight).toBeGreaterThan(0);
      expect(typeof room.pricePerNight).toBe('number');
    }
  });

  it('room max occupancy should be at least 1', () => {
    for (const room of DEFAULT_HOTEL_CONFIG.rooms) {
      expect(room.maxOccupancy).toBeGreaterThanOrEqual(1);
    }
  });

  it('should have at least 3 amenities', () => {
    expect(DEFAULT_HOTEL_CONFIG.amenities.length).toBeGreaterThanOrEqual(3);
  });

  it('should have valid contact information', () => {
    expect(DEFAULT_HOTEL_CONFIG.contact.phone).toBeTruthy();
    expect(DEFAULT_HOTEL_CONFIG.contact.email).toContain('@');
    expect(DEFAULT_HOTEL_CONFIG.contact.address).toBeTruthy();
    expect(DEFAULT_HOTEL_CONFIG.contact.city).toBeTruthy();
    expect(DEFAULT_HOTEL_CONFIG.contact.country).toBeTruthy();
  });

  it('should have valid check-in/check-out times', () => {
    expect(DEFAULT_HOTEL_CONFIG.policies.checkInTime).toBeTruthy();
    expect(DEFAULT_HOTEL_CONFIG.policies.checkOutTime).toBeTruthy();
  });

  it('should have a receptionist persona', () => {
    expect(DEFAULT_HOTEL_CONFIG.receptionistPersona).toBeTruthy();
    expect(DEFAULT_HOTEL_CONFIG.receptionistPersona.length).toBeGreaterThan(20);
  });

  it('should have supported languages including en-US', () => {
    expect(DEFAULT_HOTEL_CONFIG.supportedLanguages).toContain('en-US');
    expect(DEFAULT_HOTEL_CONFIG.supportedLanguages.length).toBeGreaterThan(5);
  });

  it('default language should be en-US', () => {
    expect(DEFAULT_HOTEL_CONFIG.language).toBe('en-US');
  });

  it('should have dining venues', () => {
    expect(DEFAULT_HOTEL_CONFIG.dining.length).toBeGreaterThan(0);
    for (const venue of DEFAULT_HOTEL_CONFIG.dining) {
      expect(venue.name).toBeTruthy();
      expect(venue.hours).toBeTruthy();
    }
  });

  it('should have welcome and farewell messages', () => {
    expect(DEFAULT_HOTEL_CONFIG.branding.welcomeMessage).toBeTruthy();
    expect(DEFAULT_HOTEL_CONFIG.branding.farewellMessage).toBeTruthy();
  });

  it('should have telephony config', () => {
    expect(DEFAULT_HOTEL_CONFIG.telephony).toBeDefined();
    expect(DEFAULT_HOTEL_CONFIG.telephony?.enabled).toBe(true);
    expect(DEFAULT_HOTEL_CONFIG.telephony?.webhookUrl).toBeTruthy();
  });
});

describe('Hotel Config — Type Safety', () => {

  it('RoomType should have all required fields', () => {
    const room: RoomType = DEFAULT_HOTEL_CONFIG.rooms[0];
    expect(room).toHaveProperty('name');
    expect(room).toHaveProperty('pricePerNight');
    expect(room).toHaveProperty('currency');
    expect(room).toHaveProperty('description');
    expect(room).toHaveProperty('maxOccupancy');
  });

  it('BrandingConfig should have all required fields', () => {
    const branding: BrandingConfig = DEFAULT_HOTEL_CONFIG.branding;
    expect(branding).toHaveProperty('hotelName');
    expect(branding).toHaveProperty('tagline');
    expect(branding).toHaveProperty('accentColor');
    expect(branding).toHaveProperty('welcomeMessage');
    expect(branding).toHaveProperty('farewellMessage');
  });

  it('ContactInfo should have all required fields', () => {
    const contact: ContactInfo = DEFAULT_HOTEL_CONFIG.contact;
    expect(contact).toHaveProperty('phone');
    expect(contact).toHaveProperty('email');
    expect(contact).toHaveProperty('address');
    expect(contact).toHaveProperty('city');
    expect(contact).toHaveProperty('country');
  });

  it('Policies should have all required fields', () => {
    const policies: HotelPolicy = DEFAULT_HOTEL_CONFIG.policies;
    expect(policies).toHaveProperty('checkInTime');
    expect(policies).toHaveProperty('checkOutTime');
    expect(policies).toHaveProperty('cancellationPolicy');
    expect(policies).toHaveProperty('petPolicy');
    expect(policies).toHaveProperty('smokingPolicy');
    expect(policies).toHaveProperty('extraBedPolicy');
    expect(policies).toHaveProperty('childPolicy');
  });
});

describe('Hotel Config — Data Integrity', () => {

  it('all room currencies should be consistent', () => {
    const currencies = DEFAULT_HOTEL_CONFIG.rooms.map(r => r.currency);
    const unique = new Set(currencies);
    expect(unique.size).toBe(1); // All rooms should use same currency
  });

  it('rooms should be sorted by price (ascending)', () => {
    const prices = DEFAULT_HOTEL_CONFIG.rooms.map(r => r.pricePerNight);
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
    }
  });

  it('all amenity names should be unique', () => {
    const names = DEFAULT_HOTEL_CONFIG.amenities.map(a => a.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it('custom FAQ should have non-empty Q&A pairs', () => {
    for (const faq of DEFAULT_HOTEL_CONFIG.customFAQ) {
      expect(faq.question.length).toBeGreaterThan(0);
      expect(faq.answer.length).toBeGreaterThan(0);
    }
  });

  it('supported languages should be valid BCP-47 codes', () => {
    const bcp47Regex = /^[a-z]{2}(-[A-Z]{2})?$/;
    for (const lang of DEFAULT_HOTEL_CONFIG.supportedLanguages) {
      expect(lang).toMatch(bcp47Regex);
    }
  });
});
