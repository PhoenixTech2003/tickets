import { existsSync } from "node:fs";
import path from "node:path";
import type { ReactNode } from "react";
import { ImageIcon, InfoIcon, PlayIcon, TriangleAlertIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Media lives in public/docs/<name>.png (screenshots) and public/docs/<name>.webm (clips).
// Until a file is captured, a labelled placeholder renders in its place (dev only).
const exists = (file: string) => existsSync(path.join(process.cwd(), "public", "docs", file));

function Frame({ caption, children }: { caption?: ReactNode; children: ReactNode }) {
  return (
    <figure className="not-prose my-8">
      <div className="overflow-hidden rounded-xl border bg-muted/40 shadow-sm">{children}</div>
      {caption && <figcaption className="mt-2.5 text-center text-sm text-muted-foreground">{caption}</figcaption>}
    </figure>
  );
}

function Placeholder({ icon: Icon, file, alt }: { icon: typeof ImageIcon; file: string; alt: string }) {
  if (process.env.NODE_ENV === "production") return null;
  return (
    <div className="grid aspect-video place-items-center p-6 text-center text-sm text-muted-foreground">
      <div className="space-y-2">
        <Icon className="mx-auto size-6 opacity-60" />
        <p>{alt}</p>
        <p className="font-mono text-xs opacity-70">public/docs/{file}</p>
      </div>
    </div>
  );
}

/** A screenshot: `<Shot name="scanner-admitted" alt="…" />` → public/docs/scanner-admitted.png */
export function Shot({ name, alt, caption }: { name: string; alt: string; caption?: ReactNode }) {
  const file = `${name}.png`;
  return (
    <Frame caption={caption}>
      {exists(file) ? (
        // eslint-disable-next-line @next/next/no-img-element -- static images are disabled for PowerSync (next.config)
        <img src={`/docs/${file}`} alt={alt} loading="lazy" className="w-full" />
      ) : (
        <Placeholder icon={ImageIcon} file={file} alt={alt} />
      )}
    </Frame>
  );
}

/** A short silent looping clip: `<Clip name="scan-flow" alt="…" />` → public/docs/scan-flow.webm */
export function Clip({ name, alt, caption }: { name: string; alt: string; caption?: ReactNode }) {
  const file = `${name}.webm`;
  return (
    <Frame caption={caption}>
      {exists(file) ? (
        <video
          src={`/docs/${file}`}
          aria-label={alt}
          autoPlay
          muted
          loop
          playsInline
          controls
          preload="metadata"
          className="w-full"
        />
      ) : (
        <Placeholder icon={PlayIcon} file={file} alt={alt} />
      )}
    </Frame>
  );
}

/** Side note. `tone="warning"` for things that can't be undone or break the door. */
export function Note({ tone = "info", children }: { tone?: "info" | "warning"; children: ReactNode }) {
  const Icon = tone === "warning" ? TriangleAlertIcon : InfoIcon;
  return (
    <div
      className={cn(
        "not-prose my-6 flex gap-3 rounded-lg border px-4 py-3 text-sm leading-relaxed",
        tone === "warning" ? "border-warning/40 bg-warning/10" : "bg-muted/50",
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", tone === "warning" ? "text-warning" : "text-muted-foreground")} />
      <div className="[&_strong]:font-semibold">{children}</div>
    </div>
  );
}
