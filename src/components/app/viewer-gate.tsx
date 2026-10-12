"use client";

import { createContext, use, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { WifiOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { PowerSyncProvider } from "@/lib/powersync/provider";
import type { Viewer } from "@/server/auth/viewer";

export type Area = "dashboard" | "scan";
export type ViewerInfo = { viewer: Viewer; access: Record<Area, boolean>; home: string };

const STORAGE_KEY = "tickets:viewer";
const AccessContext = createContext<ViewerInfo["access"] | null>(null);
const subscribeNoop = () => () => {};

function readCached(): ViewerInfo | null {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
  } catch {
    return null;
  }
}

/** Forget the cached viewer (on sign-out, or when the session is gone). */
export function clearCachedViewer() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

/**
 * Client-side gate for the dashboard and scanner. It starts from the viewer
 * cached on this device, so pages render instantly and keep working offline,
 * then confirms with the server whenever it is reachable. Losing the session
 * or the role redirects; a network error keeps the cached viewer.
 */
export function ViewerGate({ area, fallback, children }: { area: Area; fallback: ReactNode; children: ReactNode }) {
  const isClient = useSyncExternalStore(subscribeNoop, () => true, () => false);
  if (!isClient) return fallback;
  return (
    <ClientGate area={area} fallback={fallback}>
      {children}
    </ClientGate>
  );
}

function ClientGate({ area, fallback, children }: { area: Area; fallback: ReactNode; children: ReactNode }) {
  const [info, setInfo] = useState(readCached);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/viewer", { cache: "no-store" })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          clearCachedViewer();
          window.location.replace("/sign-in");
          return;
        }
        if (!res.ok) throw new Error(`Viewer request failed: ${res.status}`);
        const next: ViewerInfo = await res.json();
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {}
        setInfo(next);
        registerServiceWorker();
      })
      .catch(() => !cancelled && setOffline(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const allowed = info?.access[area];
  useEffect(() => {
    if (info && !allowed) window.location.replace(info.home);
  }, [info, allowed]);

  if (!info) return offline ? <SignInNeeded /> : fallback;
  if (!allowed) return fallback;

  return (
    <AccessContext value={info.access}>
      <PowerSyncProvider viewer={info.viewer} fallback={fallback}>
        {children}
      </PowerSyncProvider>
    </AccessContext>
  );
}

/** Which areas the signed-in viewer may open. */
export function useAccess() {
  const access = use(AccessContext);
  if (!access) throw new Error("useAccess must be used inside <ViewerGate>");
  return access;
}

function registerServiceWorker() {
  if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
  // A new build id changes the script URL, which installs a fresh worker and cache.
  navigator.serviceWorker.register(`/sw.js?v=${process.env.NEXT_PUBLIC_BUILD_ID}`).catch(() => {});
}

function SignInNeeded() {
  return (
    <div className="grid flex-1 place-items-center p-6">
      <Empty className="max-w-md rounded-xl border bg-card p-10">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <WifiOffIcon />
          </EmptyMedia>
          <EmptyTitle className="text-lg">Connect once to get started</EmptyTitle>
          <EmptyDescription>
            This device hasn&apos;t been signed in yet. Connect to the internet and sign in once. After that it works
            offline.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={() => window.location.reload()}>Try again</Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
