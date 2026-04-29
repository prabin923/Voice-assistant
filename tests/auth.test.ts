/**
 * ============================================================
 * TEST SUITE: Auth Module — lib/auth.ts
 * ============================================================
 * Tests for password hashing and JWT token creation/verification.
 * 
 * NOTE: Session cookie tests require Next.js request context,
 * so we test the pure functions here.
 */

import { describe, it, expect, beforeAll } from 'vitest';

// Set env before importing auth
process.env.JWT_SECRET = 'test-secret-key-for-vitest-only';

import { hashPassword, verifyPassword, createToken, verifyToken } from '@/lib/auth';

describe('Auth — Password Hashing', () => {

  it('should hash a password', async () => {
    const hash = await hashPassword('testPassword123');
    expect(hash).toBeTruthy();
    expect(hash).not.toBe('testPassword123');
    expect(hash.startsWith('$2')).toBe(true); // bcrypt prefix
  });

  it('TC-1.3: Should verify correct password', async () => {
    const password = 'mySecureP@ss!';
    const hash = await hashPassword(password);
    const valid = await verifyPassword(password, hash);
    expect(valid).toBe(true);
  });

  it('TC-1.4: Should reject wrong password', async () => {
    const hash = await hashPassword('correctPassword');
    const valid = await verifyPassword('wrongPassword', hash);
    expect(valid).toBe(false);
  });

  it('should produce different hashes for same password (salting)', async () => {
    const hash1 = await hashPassword('samePassword');
    const hash2 = await hashPassword('samePassword');
    expect(hash1).not.toBe(hash2);
  });

  it('should handle empty password', async () => {
    const hash = await hashPassword('');
    expect(hash).toBeTruthy();
    const valid = await verifyPassword('', hash);
    expect(valid).toBe(true);
  });

  it('should handle long passwords', async () => {
    const longPass = 'a'.repeat(100);
    const hash = await hashPassword(longPass);
    const valid = await verifyPassword(longPass, hash);
    expect(valid).toBe(true);
  });

  it('should handle special characters in password', async () => {
    const special = '!@#$%^&*()_+{}|:"<>?~`';
    const hash = await hashPassword(special);
    const valid = await verifyPassword(special, hash);
    expect(valid).toBe(true);
  });
});

describe('Auth — JWT Tokens', () => {

  it('should create a valid token', async () => {
    const token = await createToken({ hotelId: 'hotel-1', email: 'test@hotel.com' });
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); // JWT has 3 parts
  });

  it('TC-1.5: Should verify a valid token', async () => {
    const payload = { hotelId: 'hotel-1', email: 'admin@hotel.com' };
    const token = await createToken(payload);
    const verified = await verifyToken(token);

    expect(verified).not.toBeNull();
    expect(verified?.hotelId).toBe('hotel-1');
    expect(verified?.email).toBe('admin@hotel.com');
  });

  it('TC-1.6: Should reject an invalid token', async () => {
    const result = await verifyToken('invalid.token.string');
    expect(result).toBeNull();
  });

  it('should reject a tampered token', async () => {
    const token = await createToken({ hotelId: 'hotel-1', email: 'test@hotel.com' });
    const tampered = token.slice(0, -5) + 'XXXXX';
    const result = await verifyToken(tampered);
    expect(result).toBeNull();
  });

  it('should reject an empty string', async () => {
    const result = await verifyToken('');
    expect(result).toBeNull();
  });

  it('token should contain correct email', async () => {
    const email = 'unique@example.com';
    const token = await createToken({ hotelId: 'h1', email });
    const decoded = await verifyToken(token);
    expect(decoded?.email).toBe(email);
  });

  it('different payloads should produce different tokens', async () => {
    const token1 = await createToken({ hotelId: 'h1', email: 'a@b.com' });
    const token2 = await createToken({ hotelId: 'h2', email: 'c@d.com' });
    expect(token1).not.toBe(token2);
  });
});
