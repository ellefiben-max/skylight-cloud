import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

const PUBLIC_PATHS = new Set([
  "/",
  "/signup",
  "/verify-email",
  "/login",
  "/login/otp",
  "/logout",
]);

const DEVICE_API_PREFIX = "/api/boards/";
const AUTH_API_PREFIX = "/api/auth/";
const STRIPE_WEBHOOK = "/api/stripe/webhook";

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  // Always allow device API, auth API, stripe webhook, and static assets
  if (
    pathname.startsWith(DEVICE_API_PREFIX) ||
    pathname.startsWith(AUTH_API_PREFIX) ||
    pathname === STRIPE_WEBHOOK ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // Public pages
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  // Authenticated-only: check session cookie presence (deep validation happens server-side)
  const session = req.cookies.get(SESSION_COOKIE);
  if (!session) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
