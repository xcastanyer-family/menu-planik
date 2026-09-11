import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, parseSessionCookie } from "@/lib/auth/session-cookie";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const cookieValue = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = parseSessionCookie(cookieValue);
  const isAuthenticated = session?.isAuthenticated === true;

  // 1. If not authenticated, allow ONLY /login (redirect all other routes to /login)
  if (!isAuthenticated) {
    if (pathname !== "/login") {
      const loginUrl = new URL("/login", request.url);
      if (pathname !== "/") {
        loginUrl.searchParams.set("redirect", pathname + search);
      }
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 2. If authenticated and visiting /login or root /, redirect to appropriate dashboard
  if (pathname === "/login" || pathname === "/") {
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
