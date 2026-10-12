import type { Metadata } from "next";
import { Loader2Icon } from "lucide-react";
import { ScanShell } from "@/components/app/scan/scan-shell";
import { ViewerGate } from "@/components/app/viewer-gate";

export const metadata: Metadata = { title: "Scan tickets" };

const spinner = (
  <div className="grid flex-1 place-items-center">
    <Loader2Icon className="size-6 animate-spin text-primary" />
  </div>
);

// Static, like the dashboard layout: the client gate lets door devices start offline.
export default function ScanLayout({ children }: LayoutProps<"/scan">) {
  return (
    <ViewerGate area="scan" fallback={spinner}>
      <ScanShell>{children}</ScanShell>
    </ViewerGate>
  );
}
