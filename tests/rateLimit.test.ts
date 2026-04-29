/**
 * ============================================================
 * TEST SUITE: Rate Limiter — lib/rateLimit.ts
 * ============================================================
 * Unit tests for the in-memory rate limiting module.
 * Tests: window creation, counting, limiting, reset, IP extraction.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// We need to re-import for each test to get a fresh store
// Since the store is module-level, we use dynamic imports with cache clearing.

// Direct import for type reference
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';

describe('Rate Limiter — checkRateLimit()', () => {

  it('TC-8.1: First request should be allowed', () => {
    const key = `test-first-${Date.now()}`;
    const result = checkRateLimit(key, { maxRequests: 5, windowMs: 60000 });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.retryAfterMs).toBe(0);
  });

  it('TC-8.2: Requests within limit should all be allowed', () => {
    const key = `test-within-${Date.now()}`;
    const opts = { maxRequests: 5, windowMs: 60000 };

    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit(key, opts);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4 - i);
    }
  });

  it('TC-8.3: Request exceeding limit should be blocked', () => {
    const key = `test-exceed-${Date.now()}`;
    const opts = { maxRequests: 3, windowMs: 60000 };

    // Exhaust the limit
    for (let i = 0; i < 3; i++) {
      checkRateLimit(key, opts);
    }

    // 4th request should be blocked
    const result = checkRateLimit(key, opts);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it('TC-8.4: Window should reset after expiry', async () => {
    const key = `test-reset-${Date.now()}`;
    const opts = { maxRequests: 2, windowMs: 100 }; // 100ms window

    // Exhaust
    checkRateLimit(key, opts);
    checkRateLimit(key, opts);

    // Should be blocked
    let result = checkRateLimit(key, opts);
    expect(result.allowed).toBe(false);

    // Wait for window to expire
    await new Promise(r => setTimeout(r, 150));

    // Should be allowed again
    result = checkRateLimit(key, opts);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it('TC-8.2b: Remaining count decreases correctly', () => {
    const key = `test-remaining-${Date.now()}`;
    const opts = { maxRequests: 5, windowMs: 60000 };

    expect(checkRateLimit(key, opts).remaining).toBe(4);
    expect(checkRateLimit(key, opts).remaining).toBe(3);
    expect(checkRateLimit(key, opts).remaining).toBe(2);
    expect(checkRateLimit(key, opts).remaining).toBe(1);
    expect(checkRateLimit(key, opts).remaining).toBe(0);
  });

  it('should use default values when no options provided', () => {
    const key = `test-defaults-${Date.now()}`;
    const result = checkRateLimit(key);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(59); // default maxRequests is 60
  });

  it('different identifiers should have independent limits', () => {
    const key1 = `test-indep-A-${Date.now()}`;
    const key2 = `test-indep-B-${Date.now()}`;
    const opts = { maxRequests: 2, windowMs: 60000 };

    // Exhaust key1
    checkRateLimit(key1, opts);
    checkRateLimit(key1, opts);
    expect(checkRateLimit(key1, opts).allowed).toBe(false);

    // key2 should still be allowed
    expect(checkRateLimit(key2, opts).allowed).toBe(true);
  });
});

describe('Rate Limiter — getClientIP()', () => {

  it('TC-8.5: Should extract first IP from x-forwarded-for', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    expect(getClientIP(req)).toBe('1.2.3.4');
  });

  it('TC-8.6: Should fallback to x-real-ip', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-real-ip': '10.0.0.1' },
    });
    expect(getClientIP(req)).toBe('10.0.0.1');
  });

  it('should return "unknown" when no IP headers present', () => {
    const req = new Request('http://localhost');
    expect(getClientIP(req)).toBe('unknown');
  });

  it('should prefer x-forwarded-for over x-real-ip', () => {
    const req = new Request('http://localhost', {
      headers: {
        'x-forwarded-for': '1.1.1.1',
        'x-real-ip': '2.2.2.2',
      },
    });
    expect(getClientIP(req)).toBe('1.1.1.1');
  });

  it('should handle single IP in x-forwarded-for', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '9.9.9.9' },
    });
    expect(getClientIP(req)).toBe('9.9.9.9');
  });
});
