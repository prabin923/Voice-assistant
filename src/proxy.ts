import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const jwtSecret =
  process.env.JWT_SECRET ||
  (process.env.NODE_ENV === "production" ? undefined : "dev-only-local-secret-do-not-use-in-prod");
const secret = jwtSecret ? new TextEncoder().encode(jwtSecret) : null;

const protectedRoutes = ["/settings", "/admin/analytics", "/admin/support"];
const protectedApiRoutes = ["/api/config", "/api/analytics", "/api/support"];
const authRoutes = ["/admin/login", "/admin/register"];

function matchesRoute(path: string, route: string): boolean {
  return path === route || path.startsWith(`${route}/`);
}

async function verifySession(token: string) {
  try {
    if (!secret) return null;
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as { hotelId: string; email: string };
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const token = request.cookies.get("session")?.value;
  const session = token ? await verifySession(token) : null;

  // Redirect authenticated users away from auth pages
  if (authRoutes.some((route) => matchesRoute(path, route)) && session) {
    return NextResponse.redirect(new URL("/settings", request.url));
  }

  // Protect admin pages
  if (protectedRoutes.some((route) => matchesRoute(path, route)) && !session) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // Protect admin API routes
  if (protectedApiRoutes.some((route) => matchesRoute(path, route)) && !session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/settings/:path*", "/api/config/:path*", "/api/analytics/:path*", "/api/support/:path*", "/admin/:path*"],
};
