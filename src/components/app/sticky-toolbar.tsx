"use client";

import { useEffect, useRef, type ComponentProps } from "react";
import { CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Card header for a table's filters and search that sticks below the page's
 * sticky header (`--sticky-offset`), and publishes `--table-offset` on its
 * card so the table's sticky header row stacks directly under it. Give the
 * card `gap-0 pt-0` (the toolbar brings its own padding) so rows can't show
 * through around it.
 */
export function StickyToolbar({ className, ...props }: ComponentProps<typeof CardHeader>) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const toolbar = ref.current;
    const card = toolbar?.parentElement;
    if (!toolbar || !card) return;
    const update = () =>
      card.style.setProperty("--table-offset", `calc(var(--sticky-offset, 0px) + ${toolbar.offsetHeight}px)`);
    const observer = new ResizeObserver(update);
    observer.observe(toolbar);
    update();
    return () => observer.disconnect();
  }, []);

  return (
    <CardHeader
      ref={ref}
      className={cn("sticky top-(--sticky-offset,0px) z-20 bg-card pt-4 pb-4", className)}
      {...props}
    />
  );
}
