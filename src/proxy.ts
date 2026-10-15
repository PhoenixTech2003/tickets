import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/server/auth";

// Optimistic gate only: redirects signed-out visitors and refreshes the
// session. Role checks happen in layouts, actions and route handlers.
// `/continue` must be matched: it is the OAuth callbackURL, and the proxy
// exchanges the `neon_auth_session_verifier` param for the session cookie.
const authProxy = auth.middleware({ loginUrl: "/sign-in" });

export default function proxy(request: NextRequest) {
  // The landing page is public, but it reads the session. Refresh it here when
  // there is one: Server Components can't write the refreshed cookies.
  const isLanding = request.nextUrl.pathname === "/";
  if (isLanding && !request.cookies.getAll().some((c) => c.name.endsWith("neon-auth.session_token"))) {
    return NextResponse.next();
  }
  return authProxy(request);
}

export const config = {
  matcher: ["/", "/continue", "/dashboard/:path*", "/scan/:path*", "/pending"],
};
