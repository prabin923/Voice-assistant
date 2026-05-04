import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockFindByEmail = vi.fn();
const mockFindById = vi.fn();
const mockCreate = vi.fn();
const mockVerifyPassword = vi.fn();
const mockHashPassword = vi.fn();
const mockCreateToken = vi.fn();
const mockSetSessionCookie = vi.fn();
const mockGetSession = vi.fn();
const mockClearSession = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockGetClientIP = vi.fn();

vi.mock("@/lib/db", () => ({
  hotels: {
    findByEmail: mockFindByEmail,
    findById: mockFindById,
    create: mockCreate,
  },
}));

vi.mock("@/lib/auth", () => ({
  verifyPassword: mockVerifyPassword,
  hashPassword: mockHashPassword,
  createToken: mockCreateToken,
  setSessionCookie: mockSetSessionCookie,
  getSession: mockGetSession,
  clearSession: mockClearSession,
}));

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: mockCheckRateLimit,
  getClientIP: mockGetClientIP,
}));

describe("Auth integration flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockReturnValue({ allowed: true, retryAfterMs: 0 });
    mockGetClientIP.mockReturnValue("127.0.0.1");
  });

  it("redirects expired/invalid session cookie on protected page to /admin/login", async () => {
    const { proxy } = await import("@/proxy");
    const request = new NextRequest("http://localhost:3000/settings", {
      headers: { cookie: "session=invalid-token-value" },
    });

    const res = await proxy(request);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/admin/login");
  });

  it("/api/auth/me returns 401 and clears stale session", async () => {
    const { GET } = await import("@/app/api/auth/me/route");
    mockGetSession.mockResolvedValue({ hotelId: "missing-hotel", email: "x@y.com" });
    mockFindById.mockReturnValue(undefined);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Not authenticated");
    expect(mockClearSession).toHaveBeenCalledTimes(1);
  });

  it("login succeeds with valid credentials", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    mockFindByEmail.mockReturnValue({
      id: "hotel-1",
      name: "Hotel One",
      email: "admin@hotel.com",
      password: "hashed-pw",
    });
    mockVerifyPassword.mockResolvedValue(true);
    mockCreateToken.mockResolvedValue("jwt-token");

    const req = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "admin@hotel.com", password: "password123" }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.email).toBe("admin@hotel.com");
    expect(mockSetSessionCookie).toHaveBeenCalledWith("jwt-token");
  });

  it("login fails with invalid credentials", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    mockFindByEmail.mockReturnValue({
      id: "hotel-1",
      name: "Hotel One",
      email: "admin@hotel.com",
      password: "hashed-pw",
    });
    mockVerifyPassword.mockResolvedValue(false);

    const req = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "admin@hotel.com", password: "wrong-pass" }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Invalid email or password");
    expect(mockSetSessionCookie).not.toHaveBeenCalled();
  });

  it("register succeeds with new email", async () => {
    const { POST } = await import("@/app/api/auth/register/route");
    mockFindByEmail.mockReturnValue(undefined);
    mockHashPassword.mockResolvedValue("hashed-new");
    mockCreate.mockReturnValue({
      id: "hotel-2",
      name: "New Hotel",
      email: "new@hotel.com",
    });
    mockCreateToken.mockResolvedValue("new-jwt-token");

    const req = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "New Hotel",
        email: "new@hotel.com",
        password: "password123",
      }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.email).toBe("new@hotel.com");
    expect(mockSetSessionCookie).toHaveBeenCalledWith("new-jwt-token");
  });

  it("register fails for duplicate email", async () => {
    const { POST } = await import("@/app/api/auth/register/route");
    mockFindByEmail.mockReturnValue({
      id: "hotel-1",
      name: "Existing Hotel",
      email: "admin@hotel.com",
      password: "hashed",
    });

    const req = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Existing Hotel",
        email: "admin@hotel.com",
        password: "password123",
      }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toBe("Registration failed. Please try a different email.");
    expect(mockSetSessionCookie).not.toHaveBeenCalled();
  });
});
