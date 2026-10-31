import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

import { WELCOME_SEEN_COOKIE } from "./app/welcome/constants";

/**
 * Fast redirect for visitors with no session cookie at all. This is only a
 * convenience: every protected page and server action still verifies the
 * session and permissions on the server (ROADMAP §2.4).
 *
 * `/home` is where the installed app opens, so a first-time visitor there sees
 * the welcome screens before signing in.
 */
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    const { pathname } = request.nextUrl;
    if (pathname === "/home" && !request.cookies.has(WELCOME_SEEN_COOKIE)) {
      return NextResponse.redirect(new URL("/welcome", request.url));
    }
    const signIn = new URL("/sign-in", request.url);
    signIn.searchParams.set("next", pathname);
    return NextResponse.redirect(signIn);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/home", "/buyer/:path*", "/admin/:path*", "/onboarding/:path*"],
};
