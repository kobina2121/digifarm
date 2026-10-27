import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Fast redirect for visitors with no session cookie at all. This is only a
 * convenience: every protected page and server action still verifies the
 * session and permissions on the server (ROADMAP §2.4).
 */
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    const signIn = new URL("/sign-in", request.url);
    signIn.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(signIn);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/home", "/buyer/:path*", "/admin/:path*", "/onboarding/:path*"],
};
