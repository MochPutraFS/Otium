import { NextResponse } from "next/server";
import {
  ROLE_ROUTE_RULES,
  SESSION_COOKIE_NAME,
  matchesRoutePrefix,
  verifySessionToken,
} from "@/lib/jwt";

export async function middleware(request) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await verifySessionToken(token) : null;

  // 1. Blokir rute registrasi publik (/register atau /signup) -> arahkan ke /login
  if (
    matchesRoutePrefix(pathname, "/register") ||
    matchesRoutePrefix(pathname, "/signup")
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 2. Rute /login dan root /
  if (pathname === "/login" || pathname === "/") {
    const reason = request.nextUrl.searchParams.get("reason");
    if (pathname === "/login" && reason === "inactive") {
      const response = NextResponse.next();
      if (token) {
        response.cookies.delete(SESSION_COOKIE_NAME);
      }
      return response;
    }

    if (user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  // 3. Rute terproteksi tanpa sesi valid
  if (!user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Sesi tidak valid. Silakan login kembali." },
        { status: 401 }
      );
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    if (token) {
      loginUrl.searchParams.set("reason", "session_expired");
    }

    const response = NextResponse.redirect(loginUrl);
    if (token) {
      response.cookies.delete(SESSION_COOKIE_NAME);
    }
    return response;
  }

  // 4. Evaluasi Hak Akses Role (RBAC) pada halaman UI
  const matchedRule = ROLE_ROUTE_RULES.find((rule) =>
    matchesRoutePrefix(pathname, rule.prefix)
  );
  if (matchedRule && !matchedRule.allowedRoles.includes(user.role)) {
    const redirectUrl = new URL("/dashboard", request.url);
    redirectUrl.searchParams.set("error", "unauthorized_role");
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|uploads|images|api/auth/login|api/auth/logout).*)",
  ],
};
