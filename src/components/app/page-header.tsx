import type { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <SidebarTrigger className="-ml-1" />
        {eyebrow && (
          <>
            <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
            {eyebrow}
          </>
        )}
      </div>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-bold text-balance md:text-4xl">{title}</h1>
          {description && <div className="max-w-2xl text-muted-foreground">{description}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function PageBody({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-6 md:px-8 md:py-8">{children}</div>;
}

/** Row of headline figures separated by rules; `live` adds a pulsing dot. */
export function StatStrip({
  stats,
}: {
  stats: { label: string; value: number | string; hint?: string; live?: boolean }[];
}) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 overflow-hidden rounded-xl border bg-card",
        // Up to four figures share one row; more wrap into rows of three.
        stats.length <= 4 ? "lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none" : "md:grid-cols-3",
      )}
    >
      {stats.map(({ label, value, hint, live }) => (
        <div key={label} className="-mt-px -ml-px border-t border-l px-5 py-4">
          <dt className="flex items-center gap-2 text-sm text-muted-foreground">
            {live && <span className="size-1.5 animate-pulse rounded-full bg-success" />}
            {label}
          </dt>
          <dd className="mt-1 flex flex-wrap items-baseline gap-x-2">
            <span className="text-3xl font-bold tracking-tight">{typeof value === "number" ? value.toLocaleString() : value}</span>
            {hint && <span className="text-sm text-muted-foreground">{hint}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
