"use client";

import { clearCachedViewer } from "@/components/app/viewer-gate";
import { authClient } from "@/lib/auth-client";

/** Signs out and wipes the local PowerSync copy so the next user starts clean. */
export async function signOut(clearLocalData?: () => Promise<void>) {
  clearCachedViewer();
  await clearLocalData?.().catch(() => {});
  // Offline, the server session can't be ended, but the device is cleared either way.
  await authClient.signOut().catch(() => {});
  // A full reload (not router.push) drops every in-memory cache from the session.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign("/sign-in");
}
