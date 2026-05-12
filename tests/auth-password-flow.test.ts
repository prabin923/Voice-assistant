import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "crypto";
import { NextResponse } from "next/server";

const mockFindByEmail = vi.fn();
const mockFindById = vi.fn();
const mockBumpSessionVersion = vi.fn();
const mockUpdatePassword = vi.fn();
const mockHashPassword = vi.fn();
const mockInvalidateActiveForHotel = vi.fn();
const mockPasswordResetCreate = vi.fn();
const mockFindActiveByHash = vi.fn();
const mockMarkUsed = vi.fn();
const mockAuditCreate = vi.fn();
const mockRecentByHotel = vi.fn();
const mockSendPasswordResetEmail = vi.fn();
const mockGetClientIP = vi.fn();
const mockValidateCsrf = vi.fn();
const mockRequireAuth = vi.fn();
const mockGetSession = vi.fn();
const mockClearSession = vi.fn();

vi.mock("@/lib/db", () => ({
  hotels: {
    findByEmail: mockFindByEmail,
    findById: mockFindById,
    bumpSessionVersion: mockBumpSessionVersion,
    updatePassword: mockUpdatePassword,
  },
  authAuditLogs: {
    create: mockAuditCreate,
    recentByHotel: mockRecentByHotel,
  },
  passwordResetTokens: {
    invalidateActiveForHotel: mockInvalidateActiveForHotel,
    create: mockPasswordResetCreate,
    findActiveByHash: mockFindActiveByHash,
    markUsed: mockMarkUsed,
  },
}));

vi.mock("@/lib/auth", () => ({
  hashPassword: mockHashPassword,
  getSession: mockGetSession,
  clearSession: mockClearSession,
  requireAuth: mockRequireAuth,
}));

vi.mock("@/lib/rateLimit", () => ({
  getClientIP: mockGetClientIP,
}));

vi.mock("@/lib/csrf", () => ({
  validateCsrf: mockValidateCsrf,
}));

vi.mock("@/lib/email", () => ({
  sendPasswordResetEmail: mockSendPasswordResetEmail,
}));

vi.mock("crypto", async (importOriginal) => {
  const crypto = await importOriginal<typeof import("crypto")>();
  return {
    ...crypto,
    randomBytes: vi.fn(() => Buffer.alloc(32, 1)),
  };
});

function csrfHeaders() {
  return {
    "content-type": "application/json",
    origin: "http://localhost:3000",
    "x-csrf-token": "test-csrf",
  };
}

describe("Auth password reset and audit routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClientIP.mockReturnValue("10.0.0.1");
    mockValidateCsrf.mockResolvedValue(null);
    mockBumpSessionVersion.mockReturnValue(2);
  });

  it("POST forgot-password returns generic message for empty email", async () => {
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    const res = await POST(
      new Request("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({ email: "" }),
      })
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("POST forgot-password creates token and sends email when hotel exists", async () => {
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    mockFindByEmail.mockReturnValue({
      id: "hotel-99",
      name: "Test Inn",
      email: "owner@testinn.com",
      password: "hash",
      session_version: 0,
    });

    const res = await POST(
      new Request("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        headers: { ...csrfHeaders(), host: "localhost:3000" },
        body: JSON.stringify({ email: "owner@testinn.com" }),
      })
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockInvalidateActiveForHotel).toHaveBeenCalledWith("hotel-99");
    expect(mockPasswordResetCreate).toHaveBeenCalled();
    const createArg = mockPasswordResetCreate.mock.calls[0][0];
    const rawToken = Buffer.alloc(32, 1).toString("hex");
    expect(createArg.tokenHash).toBe(createHash("sha256").update(rawToken).digest("hex"));
    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        toEmail: "owner@testinn.com",
        hotelName: "Test Inn",
        resetUrl: expect.stringContaining("/admin/reset-password?token="),
      })
    );
    expect(mockAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({ event: "password_reset_request", hotelId: "hotel-99" })
    );
  });

  it("POST reset-password succeeds and rotates session", async () => {
    const { POST } = await import("@/app/api/auth/reset-password/route");
    const rawToken = "deadbeef";
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    mockFindActiveByHash.mockReturnValue({ id: "tok-1", hotel_id: "hotel-99" });
    mockFindById.mockReturnValue({
      id: "hotel-99",
      email: "owner@testinn.com",
      name: "Test Inn",
      password: "old",
      session_version: 1,
    });
    mockHashPassword.mockResolvedValue("new-hash");

    const res = await POST(
      new Request("http://localhost:3000/api/auth/reset-password", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({ token: rawToken, password: "newpass123" }),
      })
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockUpdatePassword).toHaveBeenCalledWith("hotel-99", "new-hash");
    expect(mockBumpSessionVersion).toHaveBeenCalledWith("hotel-99");
    expect(mockMarkUsed).toHaveBeenCalledWith("tok-1");
    expect(mockInvalidateActiveForHotel).toHaveBeenCalledWith("hotel-99");
    expect(mockAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({ event: "password_reset_success", hotelId: "hotel-99" })
    );
  });

  it("POST reset-password returns generic error for bad token", async () => {
    const { POST } = await import("@/app/api/auth/reset-password/route");
    mockFindActiveByHash.mockReturnValue(undefined);
    const res = await POST(
      new Request("http://localhost:3000/api/auth/reset-password", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({ token: "nope", password: "newpass123" }),
      })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Reset failed");
  });

  it("GET audit returns logs when authenticated", async () => {
    const { GET } = await import("@/app/api/auth/audit/route");
    const logs = [{ id: "1", event: "login_success", email: "a@b.com", created_at: "2026-01-01 00:00:00" }];
    mockRequireAuth.mockResolvedValue({
      session: { hotelId: "hotel-99", email: "a@b.com", tokenVersion: 1 },
    });
    mockRecentByHotel.mockReturnValue(logs);

    const res = await GET(new Request("http://localhost:3000/api/auth/audit?limit=10"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.logs).toEqual(logs);
    expect(mockRecentByHotel).toHaveBeenCalledWith("hotel-99", 10);
  });

  it("GET audit returns 401 when requireAuth fails", async () => {
    const { GET } = await import("@/app/api/auth/audit/route");
    mockRequireAuth.mockResolvedValue({
      error: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    });
    const res = await GET(new Request("http://localhost:3000/api/auth/audit"));
    expect(res.status).toBe(401);
  });

  it("POST logout records audit and clears session without bumping version", async () => {
    const { POST } = await import("@/app/api/auth/logout/route");
    mockGetSession.mockResolvedValue({ hotelId: "hotel-99", email: "a@b.com", tokenVersion: 1 });
    const res = await POST(
      new Request("http://localhost:3000/api/auth/logout", {
        method: "POST",
        headers: csrfHeaders(),
      })
    );
    expect(res.status).toBe(200);
    expect(mockBumpSessionVersion).not.toHaveBeenCalled();
    expect(mockAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({ event: "logout", hotelId: "hotel-99" })
    );
    expect(mockClearSession).toHaveBeenCalledTimes(1);
  });
});
