import { NextResponse, type NextRequest } from "next/server";
import {
  DEFAULT_RESTAURANT_SLUG,
  extractSubdomain,
  isApexHost,
} from "@/lib/tenant-constants";
import { DEFAULT_BRANCH_SLUG } from "@/lib/branch-constants";
import { parseSessionToken, roleCanAccessRoute } from "@/lib/auth";

const PROTECTED_PREFIXES = ["/dashboard", "/kitchen", "/admin"];
const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/demo",
  "/api/auth",
  "/api/tenant",
  "/api/health",
  "/api/simulate",
  "/api/demo",
  "/api/twilio",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") ?? "localhost:3000";
  const hostname = host.split(":")[0] ?? "localhost";

  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  const subdomain = extractSubdomain(host);
  const tenantSlug =
    subdomain ??
    request.nextUrl.searchParams.get("tenant") ??
    (hostname === "localhost" || hostname === "127.0.0.1"
      ? process.env.DEFAULT_TENANT_SLUG ?? DEFAULT_RESTAURANT_SLUG
      : null);

  const branchSlug =
    request.nextUrl.searchParams.get("branch") ??
    request.cookies.get("rwo_branch")?.value ??
    DEFAULT_BRANCH_SLUG;

  const requestHeaders = new Headers(request.headers);
  if (tenantSlug) {
    requestHeaders.set("x-restaurant-slug", tenantSlug);
  }
  if (branchSlug) {
    requestHeaders.set("x-branch-slug", branchSlug);
  }

  const isPublic = PUBLIC_PATHS.some((prefix) => pathname.startsWith(prefix));
  const isProtected =
    PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix)) && !isPublic;

  if (isProtected && process.env.DEMO_MODE !== "true") {
    const session = parseSessionToken(request.cookies.get("rwo_session")?.value);
    if (!session) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (!roleCanAccessRoute(session.role, pathname)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  if (isApexHost(hostname) && pathname.startsWith("/dashboard")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
