"use client";

import { useEffect, type MouseEvent } from "react";
import { useSearchParams } from "next/navigation";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

/** Pages to show: first, last, and the current page's neighbours, with gaps as "…". */
function pageList(page: number, pageCount: number): (number | "gap")[] {
  const keep = new Set([1, pageCount, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pageCount));
  const sorted = [...keep].sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? (["gap", p] as const) : [p]));
}

/**
 * "Showing 11–20 of 134" plus page links. Links carry real `?page=` hrefs (so
 * they can be opened in a new tab) but a plain click updates nuqs state in place.
 * Renders nothing when everything fits on one page.
 */
export function Paginator({
  page,
  pageSize,
  total,
  onPageChange,
  noun = "results",
  paramKey = "page",
  className,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  noun?: string;
  paramKey?: string;
  className?: string;
}) {
  const searchParams = useSearchParams();
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;

  const current = Math.min(Math.max(page, 1), pageCount);
  const first = (current - 1) * pageSize + 1;
  const last = Math.min(current * pageSize, total);

  const href = (p: number) => {
    const params = new URLSearchParams(searchParams);
    if (p === 1) params.delete(paramKey);
    else params.set(paramKey, String(p));
    const query = params.toString();
    return query ? `?${query}` : "?";
  };
  const go = (p: number) => (e: MouseEvent<HTMLAnchorElement>) => {
    // Let modified clicks (new tab/window) use the href.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    onPageChange(p);
  };

  return (
    <div className={cn("flex flex-col items-center gap-3 sm:flex-row sm:justify-between", className)}>
      <p className="text-sm text-muted-foreground tabular-nums">
        Showing {first.toLocaleString()}–{last.toLocaleString()} of {total.toLocaleString()} {noun}
      </p>
      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href={href(current - 1)}
              onClick={go(current - 1)}
              aria-disabled={current === 1}
              className={cn(current === 1 && "pointer-events-none opacity-50")}
              tabIndex={current === 1 ? -1 : undefined}
            />
          </PaginationItem>
          {pageList(current, pageCount).map((p, i) =>
            p === "gap" ? (
              <PaginationItem key={`gap-${i}`} className="hidden sm:block">
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={p} className={cn(p !== current && "hidden sm:block")}>
                <PaginationLink href={href(p)} onClick={go(p)} isActive={p === current} className="tabular-nums">
                  {p}
                </PaginationLink>
              </PaginationItem>
            ),
          )}
          <PaginationItem>
            <PaginationNext
              href={href(current + 1)}
              onClick={go(current + 1)}
              aria-disabled={current === pageCount}
              className={cn(current === pageCount && "pointer-events-none opacity-50")}
              tabIndex={current === pageCount ? -1 : undefined}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

/** Moves back to the last page when results shrink (e.g. a narrower search) past the current one. */
export function useClampPage(page: number, total: number, pageSize: number, setPage: (page: number) => void) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  useEffect(() => {
    if (total > 0 && page > pageCount) setPage(pageCount);
  }, [page, pageCount, total, setPage]);
}
