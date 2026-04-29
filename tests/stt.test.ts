/**
 * ============================================================
 * TEST SUITE: STT API — Validation Logic
 * ============================================================
 * Tests for the Speech-to-Text API route input validation:
 * MIME type handling, file size limits, codec param stripping.
 * 
 * NOTE: These test the validation logic without hitting Gemini API.
 */

import { describe, it, expect } from 'vitest';

// ─── MIME Type Validation Logic (extracted from route) ───
const ALLOWED_AUDIO_TYPES = new Set([
  "audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg",
  "audio/wav", "audio/x-wav", "audio/flac"
]);

function validateMimeType(mimeType: string): { valid: boolean; baseMime: string } {
  const baseMime = mimeType.split(";")[0].trim();
  return { valid: ALLOWED_AUDIO_TYPES.has(baseMime), baseMime };
}

function validateAudioSize(sizeBytes: number, maxSize = 10 * 1024 * 1024): boolean {
  return sizeBytes <= maxSize;
}

function sanitizeLanguage(lang: string): string {
  return (lang || "en-US").replace(/[^a-zA-Z0-9\-]/g, "").slice(0, 10);
}

describe('STT API — MIME Type Validation', () => {

  it('TC-3.5: Should accept audio/webm;codecs=opus', () => {
    const result = validateMimeType("audio/webm;codecs=opus");
    expect(result.valid).toBe(true);
    expect(result.baseMime).toBe("audio/webm");
  });

  it('should accept plain audio/webm', () => {
    const result = validateMimeType("audio/webm");
    expect(result.valid).toBe(true);
  });

  it('should accept audio/mp4', () => {
    const result = validateMimeType("audio/mp4");
    expect(result.valid).toBe(true);
  });

  it('should accept audio/wav', () => {
    const result = validateMimeType("audio/wav");
    expect(result.valid).toBe(true);
  });

  it('should accept audio/ogg', () => {
    const result = validateMimeType("audio/ogg");
    expect(result.valid).toBe(true);
  });

  it('should accept audio/flac', () => {
    const result = validateMimeType("audio/flac");
    expect(result.valid).toBe(true);
  });

  it('TC-3.4: Should reject audio/aac', () => {
    const result = validateMimeType("audio/aac");
    expect(result.valid).toBe(false);
  });

  it('should reject video/mp4', () => {
    const result = validateMimeType("video/mp4");
    expect(result.valid).toBe(false);
  });

  it('should reject text/plain', () => {
    const result = validateMimeType("text/plain");
    expect(result.valid).toBe(false);
  });

  it('should handle codec params with spaces', () => {
    const result = validateMimeType("audio/webm ; codecs=opus");
    expect(result.valid).toBe(true);
    expect(result.baseMime).toBe("audio/webm");
  });

  it('should handle multiple codec params', () => {
    const result = validateMimeType("audio/ogg;codecs=vorbis;channels=2");
    expect(result.valid).toBe(true);
    expect(result.baseMime).toBe("audio/ogg");
  });
});

describe('STT API — File Size Validation', () => {

  const MAX_SIZE = 10 * 1024 * 1024; // 10MB

  it('TC-3.1: Should accept audio under 10MB', () => {
    expect(validateAudioSize(5 * 1024 * 1024)).toBe(true);
  });

  it('should accept exactly 10MB', () => {
    expect(validateAudioSize(MAX_SIZE)).toBe(true);
  });

  it('TC-3.3: Should reject audio over 10MB', () => {
    expect(validateAudioSize(15 * 1024 * 1024)).toBe(false);
  });

  it('should accept tiny audio file', () => {
    expect(validateAudioSize(1024)).toBe(true);
  });

  it('should reject just over the limit', () => {
    expect(validateAudioSize(MAX_SIZE + 1)).toBe(false);
  });
});

describe('STT API — Language Sanitization', () => {

  it('should pass through valid language code', () => {
    expect(sanitizeLanguage("en-US")).toBe("en-US");
  });

  it('should strip special characters', () => {
    const result = sanitizeLanguage("en-US; DROP TABLE");
    // Strips non-alphanumeric/dash chars -> "en-USDROPTABLE", then truncates to 10 chars
    expect(result).toBe("en-USDROPT");
  });

  it('should handle empty string with default', () => {
    expect(sanitizeLanguage("")).toBe("en-US");
  });

  it('should truncate overly long input', () => {
    const long = "abcdefghijklmnop";
    expect(sanitizeLanguage(long).length).toBeLessThanOrEqual(10);
  });

  it('should handle Nepali language code', () => {
    expect(sanitizeLanguage("ne-NP")).toBe("ne-NP");
  });

  it('should handle Japanese language code', () => {
    expect(sanitizeLanguage("ja-JP")).toBe("ja-JP");
  });
});
