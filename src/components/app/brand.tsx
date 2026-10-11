import Link from "next/link";
import { cn } from "@/lib/utils";

/** Wordmark: a solid stub glyph next to the name. */
export function Brand({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5", className)}>
      <span aria-hidden className="relative flex h-8 w-6 shrink-0 flex-col overflow-hidden rounded-[0.4rem] bg-primary">
        <span className="h-[62%]" />
        <span className="mx-1 border-t-2 border-dotted border-primary-foreground/70" />
      </span>
      <span className="text-lg font-bold tracking-tight">Tickets</span>
    </Link>
  );
}
