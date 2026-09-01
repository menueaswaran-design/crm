import { NextResponse } from "next/server";

const TOKEN_COOKIE = "crm_token";
const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password", "/api/auth", "/_next", "/favicon.ico", "/public"];

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const token = request.cookies.get(TOKEN_COOKIE)?.value;

  // API routes enforce their own token verification; just pass through.
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  if (isPublic) {
    // Already logged in users skip the login page.
    if (pathname === "/login" && token) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!token) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|uploads|.*\\.(?:svg|png|jpg|jpeg|gif|ico)$).*)"],
};
