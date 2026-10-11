"use client";

import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

function DownloadProgress({ received, total }: { received: number; total: number | null }) {
  if (!total) {
    return (
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Preparing download">
        <div className="h-full w-1/3 animate-indeterminate rounded-full bg-primary motion-reduce:animate-none" />
      </div>
    );
  }
  const pct = Math.round((received / total) * 100);
  return (
    <div className="mt-2 space-y-1">
      <Progress value={pct} aria-label="Download progress" />
      <p className="text-xs text-muted-foreground tabular-nums">
        {pct}% · {formatBytes(received)} of {formatBytes(total)}
      </p>
    </div>
  );
}

const formatBytes = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** Filename from `Content-Disposition: attachment; filename="…"`. */
const filenameFrom = (header: string | null) => header?.match(/filename="?([^";]+)"?/)?.[1] ?? "download";

/**
 * Downloads `url` while showing progress in a toast: an indeterminate bar while
 * the server prepares the file, then a percentage as bytes arrive. Resolves
 * when the file has been handed to the browser.
 */
export async function downloadWithProgress(url: string, label: string) {
  const id = toast.loading(`Preparing ${label}…`, {
    description: <DownloadProgress received={0} total={null} />,
    duration: Infinity,
  });
  try {
    const response = await fetch(url);
    if (!response.ok || !response.body) {
      toast.error(`Couldn't download ${label}`, { id, description: (await response.text()) || response.statusText, duration: 6000 });
      return;
    }
    const total = Number(response.headers.get("Content-Length")) || null;
    const reader = response.body.getReader();
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let received = 0;
    let lastUpdate = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      // Re-render the toast at most ~10 times a second.
      if (performance.now() - lastUpdate > 100) {
        lastUpdate = performance.now();
        toast.loading(`Downloading ${label}…`, { id, description: <DownloadProgress received={received} total={total} /> });
      }
    }

    const href = URL.createObjectURL(new Blob(chunks, { type: response.headers.get("Content-Type") ?? undefined }));
    const link = Object.assign(document.createElement("a"), { href, download: filenameFrom(response.headers.get("Content-Disposition")) });
    link.click();
    setTimeout(() => URL.revokeObjectURL(href), 10_000);
    toast.success(`Downloaded ${label}`, { id, description: formatBytes(received), duration: 4000 });
  } catch {
    toast.error(`Couldn't download ${label}`, { id, description: "Check your connection and try again.", duration: 6000 });
  }
}
