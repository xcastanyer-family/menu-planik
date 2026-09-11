import { UserSession, UserRole, UserAccountStatus } from "@/types";

export const SESSION_COOKIE_NAME = "menuplanik_session";

export interface CookieSessionData {
  userId?: string;
  memberId: string;
  familyId: string;
  name: string;
  email: string;
  role: UserRole;
  status?: UserAccountStatus;
  familyCode: string;
  familyName: string;
  isAuthenticated: boolean;
}

/**
 * Sets the session cookie in the browser.
 */
export function setSessionCookie(session: UserSession | null) {
  if (typeof document === "undefined") return;

  if (!session || !session.isAuthenticated) {
    document.cookie = `${SESSION_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
    return;
  }

  const data: CookieSessionData = {
    userId: session.userId,
    memberId: session.memberId,
    familyId: session.familyId,
    name: session.name,
    email: session.email,
    role: session.role,
    status: session.status,
    familyCode: session.familyCode,
    familyName: session.familyName,
    isAuthenticated: Boolean(session.isAuthenticated),
  };

  const encoded = encodeURIComponent(JSON.stringify(data));
  // 30 days expiration
  const maxAge = 60 * 60 * 24 * 30;
  const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
  document.cookie = `${SESSION_COOKIE_NAME}=${encoded}; path=/; max-age=${maxAge}; SameSite=Lax${isSecure ? "; Secure" : ""}`;
}

/**
 * Clears the session cookie.
 */
export function clearSessionCookie() {
  if (typeof document === "undefined") return;
  const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
  document.cookie = `${SESSION_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax${isSecure ? "; Secure" : ""}`;
}

/**
 * Parses session from cookie header string (useful in server/middleware environments).
 */
export function parseSessionCookie(cookieValue?: string | null): CookieSessionData | null {
  if (!cookieValue) return null;
  try {
    const decoded = decodeURIComponent(cookieValue);
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed === "object" && parsed.role) {
      // Normalize legacy role names if present
      if (parsed.role === "superuser") parsed.role = "superadmin";
      if (parsed.role === "organizer") parsed.role = "admin";
      if (parsed.role === "member") parsed.role = "user";
      return parsed as CookieSessionData;
    }
    return null;
  } catch {
    return null;
  }
}
