import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-dev-secret");

const protectedRoutes = ["/settings"];
const protectedApiRoutes = ["/api/config"];
const authRoutes = ["/admin/login", "/admin/register"];

async function verifySession(token: string) {
  try {
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
  if (authRoutes.some((route) => path.startsWith(route)) && session) {
    return NextResponse.redirect(new URL("/settings", request.url));
  }

  // Protect admin pages
  if (protectedRoutes.some((route) => path.startsWith(route)) && !session) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // Protect admin API routes
  if (protectedApiRoutes.some((route) => path.startsWith(route)) && !session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/settings/:path*", "/api/config/:path*", "/admin/:path*"],
};
