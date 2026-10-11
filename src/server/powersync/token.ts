import "server-only";
import { SignJWT } from "jose";
import type { Viewer } from "@/server/auth/viewer";

const TOKEN_TTL_SECONDS = 5 * 60;

/**
 * PowerSync client token, signed with our own HS256 key instead of reusing
 * the Neon Auth JWT. Neon Auth tokens can't carry custom claims, and the sync
 * streams need the platform `role` claim to give admins the full data set —
 * PowerSync's recommended pattern is a backend-issued role claim. The short
 * TTL means role changes reach sync within minutes.
 */
export async function createPowerSyncToken(viewer: Viewer) {
  const secret = Buffer.from(process.env.POWERSYNC_JWT_SECRET!, "base64url");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000);
  const token = await new SignJWT({ role: viewer.role })
    .setProtectedHeader({ alg: "HS256", kid: process.env.POWERSYNC_JWT_KID ?? "tickets" })
    .setSubject(viewer.id)
    .setAudience(process.env.POWERSYNC_URL!)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secret);
  return { token, expiresAt: expiresAt.toISOString(), endpoint: process.env.POWERSYNC_URL! };
}
