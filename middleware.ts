import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, parseSessionCookie } from "@/lib/auth/session-cookie";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const cookieValue = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = parseSessionCookie(cookieValue);
  const isAuthenticated = session?.isAuthenticated === true;

  // 1. The /login page must ALWAYS be accessible without redirects
  if (pathname === "/login") {
    return NextResponse.next();
  }

  // 2. If not authenticated, redirect all protected routes to /login
  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("redirect", pathname + search);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 3. If authenticated and visiting root /, redirect to appropriate dashboard
  if (pathname === "/") {
    if (session.role === "superadmin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.redirect(new URL("/planner", request.url));
  }

  // 3. Protection for Superadmin Dashboard (/admin)
  if (pathname.startsWith("/admin")) {
    if (session.role !== "superadmin") {
      return NextResponse.redirect(new URL("/planner", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
