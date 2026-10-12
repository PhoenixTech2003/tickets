import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRightIcon, MenuIcon } from "lucide-react";
import { Brand } from "@/components/app/brand";
import { DocsNav, DocsPager } from "@/components/app/docs/docs-nav";
import { LegalFooter } from "@/components/app/legal-page";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: { template: "%s · Docs", default: "Docs" },
  description: "How to run events, print tickets and scan guests in with Tickets.",
};

// Prose styles for the MDX body; components opt out with `not-prose`.
const PROSE = [
  "leading-relaxed text-[0.95rem] [&>*+*]:mt-4",
  "[&_h1]:text-4xl [&_h1]:font-extrabold [&_h1]:tracking-tight [&_h1]:text-balance",
  "[&_h1+p]:mt-3 [&_h1+p]:text-lg [&_h1+p]:text-muted-foreground",
  "[&_h2]:mt-12 [&_h2]:scroll-mt-20 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-tight",
  "[&_h3]:mt-8 [&_h3]:text-lg [&_h3]:font-semibold",
  "[&_p_a]:underline [&_li_a]:underline [&_td_a]:underline [&_a]:underline-offset-4",
  "[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:space-y-2 [&_ol]:space-y-2 [&_ul]:pl-5 [&_ol]:pl-5 [&_li]:pl-1",
  "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em]",
  "[&_kbd]:rounded [&_kbd]:border [&_kbd]:px-1.5 [&_kbd]:font-mono [&_kbd]:text-xs",
  "[&_table]:block [&_table]:w-full [&_table]:overflow-x-auto [&_table]:text-sm",
  "[&_th]:border-b [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-medium [&_th]:text-muted-foreground",
  "[&_td]:border-b [&_td]:px-3 [&_td]:py-2 [&_td]:align-top",
].join(" ");

export default function DocsLayout({ children }: LayoutProps<"/docs">) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 sm:px-6">
      <header className="sticky top-0 z-20 -mx-4 flex items-center gap-3 border-b bg-background/80 px-4 py-4 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <Brand />
        <span className="font-mono text-xs tracking-wider text-muted-foreground uppercase">Docs</span>
        <div className="ml-auto flex items-center gap-1.5">
          <Button asChild variant="ghost" size="sm">
            <Link href="/continue">
              Open app
              <ArrowUpRightIcon data-icon="inline-end" />
            </Link>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex-1 gap-12 py-8 md:grid md:grid-cols-[13rem_minmax(0,1fr)] lg:py-12">
        <aside className="md:sticky md:top-24 md:max-h-[calc(100svh-7rem)] md:self-start md:overflow-y-auto">
          <details className="group rounded-lg border md:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm font-medium">
              <MenuIcon className="size-4" />
              All docs
            </summary>
            <DocsNav className="border-t p-3" />
          </details>
          <DocsNav className="hidden md:block" />
        </aside>

        <main className="mt-8 min-w-0 max-w-3xl md:mt-0">
          <article className={PROSE}>{children}</article>
          <DocsPager />
        </main>
      </div>

      <LegalFooter />
    </div>
  );
}
