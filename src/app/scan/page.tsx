import { Scanner } from "@/components/app/scan/scanner";

// Rendered client-side from PowerSync's local SQLite (see PowerSyncProvider),
// so the server never renders this segment and Next can't validate it for
// instant navigation. Navigations inside the app shell are instant anyway.
export const instant = false;

export default function ScanPage() {
  return <Scanner />;
}
