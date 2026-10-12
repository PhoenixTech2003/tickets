"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { DOCS_NAV, DOCS_PAGES } from "@/app/docs/nav";
import { cn } from "@/lib/utils";

export function DocsNav({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Docs" className={cn("space-y-6 text-sm", className)}>
      {DOCS_NAV.map(({ group, pages }) => (
        <div key={group} className="space-y-1">
          <p className="px-2 pb-1 font-mono text-[0.7rem] tracking-wider text-muted-foreground uppercase">{group}</p>
          {pages.map(({ href, title }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className="block rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground aria-[current=page]:bg-muted aria-[current=page]:font-medium aria-[current=page]:text-foreground"
            >
              {title}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}

/** Previous / next links at the foot of each docs page. */
export function DocsPager() {
  const pathname = usePathname();
  const i = DOCS_PAGES.findIndex((p) => p.href === pathname);
  const prev = DOCS_PAGES[i - 1];
  const next = DOCS_PAGES[i + 1];
  if (i === -1) return null;

  return (
    <div className="mt-16 grid gap-3 border-t pt-6 sm:grid-cols-2">
      {prev ? <PagerLink {...prev} label="Previous" /> : <span />}
      {next && <PagerLink {...next} label="Next" align="end" />}
    </div>
  );
}

function PagerLink({ href, title, label, align }: { href: string; title: string; label: string; align?: "end" }) {
  const Icon = align ? ArrowRightIcon : ArrowLeftIcon;
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col gap-1 rounded-lg border p-4 transition-colors hover:bg-muted",
        align && "items-end text-right sm:col-start-2",
      )}
    >
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {!align && <Icon className="size-3.5" />}
        {label}
        {align && <Icon className="size-3.5" />}
      </span>
      <span className="font-medium">{title}</span>
    </Link>
  );
}
