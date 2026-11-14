import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { roleHome } from "@/lib/rbac";
import type { Role } from "@/lib/generated/prisma/enums";

// First line of defence only. Every role layout re-checks the role on the server.
const AREA_ROLE: Record<string, Role> = {
  "/mother": "MOTHER",
  "/clinic": "CLINIC",
  "/admin": "SYSTEM_ADMIN",
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let session: Awaited<ReturnType<typeof auth.api.getSession>>;
  try {
    session = await auth.api.getSession({ headers: request.headers });
  } catch (error) {
    // The database was unreachable (for example Neon waking up, or a network drop).
    // Don't crash: let the page load. Every role layout re-checks the session on the
    // server and shows a retry screen, so nothing private is shown meanwhile.
    console.error("Session lookup failed in proxy", error);
    return NextResponse.next();
  }
  const role = (session?.user as { role?: Role } | undefined)?.role;

  // Signed-out: only /login is reachable.
  if (!session) {
    if (pathname === "/login") return NextResponse.next();
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const home = roleHome(role ?? "MOTHER");

  // Signed-in users do not need the login page. Only redirect page loads: server
  // actions are POSTed to /login right after sign-in and must not be redirected.
  if (pathname === "/login") {
    if (request.method === "GET" || request.method === "HEAD") {
      return NextResponse.redirect(new URL(home, request.url));
    }
    return NextResponse.next();
  }

  // Each role may only open its own area; anything else goes to their own home.
  const area = Object.keys(AREA_ROLE).find(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (area && AREA_ROLE[area] !== role) {
    return NextResponse.redirect(new URL(home, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/mother/:path*", "/clinic/:path*", "/admin/:path*"],
};
