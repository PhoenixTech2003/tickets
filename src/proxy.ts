import { auth } from "@/server/auth";

// Optimistic gate only: redirects signed-out visitors and refreshes the
// session. Role checks happen in layouts, actions and route handlers.
// `/continue` must be matched: it is the OAuth callbackURL, and the proxy
// exchanges the `neon_auth_session_verifier` param for the session cookie.
export default auth.middleware({ loginUrl: "/sign-in" });

export const config = {
  matcher: ["/continue", "/dashboard/:path*", "/scan/:path*", "/pending"],
};
