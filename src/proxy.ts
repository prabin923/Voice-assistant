import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getJwtSecretBytes, hasProductionJwtSecret } from "@/lib/jwtSecret";

const protectedRoutes = ["/settings", "/admin/analytics", "/admin/support"];
const protectedApiRoutes = ["/api/analytics", "/api/support"];
const authRoutes = ["/admin/login", "/admin/register", "/admin/forgot-password", "/admin/reset-password"];

function matchesRoute(path: string, route: string): boolean {
  return path === route || path.startsWith(`${route}/`);
}

async function verifySession(token: string) {
  try {
    if (!hasProductionJwtSecret() && process.env.NODE_ENV === "production") return null;
    const { payload } = await jwtVerify(token, getJwtSecretBytes());
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

  // Protect config mutations only; GET is public (assistant + landing branding)
  if (matchesRoute(path, "/api/config") && request.method !== "GET" && !session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Protect admin API routes
  if (protectedApiRoutes.some((route) => matchesRoute(path, route)) && !session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/settings/:path*", "/api/config", "/api/analytics/:path*", "/api/support/:path*", "/admin/:path*"],
};
