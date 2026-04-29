/**
 * ============================================================
 * TEST SUITE: Languages Module — lib/languages.ts
 * ============================================================
 * Tests for the language configuration and lookup utilities.
 */

import { describe, it, expect } from 'vitest';
import { SUPPORTED_LANGUAGES, getLanguageByCode } from '@/lib/languages';

describe('Languages — Data Structure', () => {

  it('should have at least 10 languages', () => {
    expect(SUPPORTED_LANGUAGES.length).toBeGreaterThanOrEqual(10);
  });

  it('every language should have required fields', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(lang).toHaveProperty('code');
      expect(lang).toHaveProperty('name');
      expect(typeof lang.code).toBe('string');
      expect(typeof lang.name).toBe('string');
      expect(lang.code.length).toBeGreaterThan(0);
      expect(lang.name.length).toBeGreaterThan(0);
    }
  });

  it('language codes should be unique', () => {
    const codes = SUPPORTED_LANGUAGES.map(l => l.code);
    const unique = new Set(codes);
    expect(unique.size).toBe(codes.length);
  });

  it('should include English', () => {
    const english = SUPPORTED_LANGUAGES.find(l => l.code === 'en-US' || l.code.startsWith('en'));
    expect(english).toBeDefined();
  });

  it('should include Nepali', () => {
    const nepali = SUPPORTED_LANGUAGES.find(l => l.code === 'ne-NP' || l.name.toLowerCase().includes('nepali'));
    expect(nepali).toBeDefined();
  });

  it('should include major languages (Spanish, French, Japanese, Chinese)', () => {
    const codes = SUPPORTED_LANGUAGES.map(l => l.code);
    const hasSpanish = codes.some(c => c.startsWith('es'));
    const hasFrench = codes.some(c => c.startsWith('fr'));
    const hasJapanese = codes.some(c => c.startsWith('ja'));
    const hasChinese = codes.some(c => c.startsWith('zh'));

    expect(hasSpanish).toBe(true);
    expect(hasFrench).toBe(true);
    expect(hasJapanese).toBe(true);
    expect(hasChinese).toBe(true);
  });

  it('language codes should follow BCP-47 pattern', () => {
    const bcp47 = /^[a-z]{2,3}(-[A-Z][A-Za-z]{1,3})?$/;
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(lang.code).toMatch(bcp47);
    }
  });
});

describe('Languages — Lookup Functions', () => {

  it('getLanguageByCode should find English', () => {
    const lang = getLanguageByCode('en-US');
    expect(lang).toBeDefined();
    expect(lang?.name.toLowerCase()).toContain('english');
  });

  it('getLanguageByCode should return undefined for invalid code', () => {
    const lang = getLanguageByCode('xx-XX');
    expect(lang).toBeUndefined();
  });

  it('getLanguageByCode should find Nepali', () => {
    const lang = getLanguageByCode('ne-NP');
    expect(lang).toBeDefined();
  });
});
