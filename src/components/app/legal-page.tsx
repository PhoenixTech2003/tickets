import Link from "next/link";
import { Brand } from "@/components/app/brand";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { site } from "@/lib/site";

/** Shared shell for the privacy policy and terms of service. */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 sm:px-6">
      <header className="flex items-center justify-between py-5">
        <Brand />
        <ThemeToggle />
      </header>
      <main className="flex-1 py-10">
        <h1 className="text-4xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated {site.legalUpdated}</p>
        <div className="mt-10 space-y-4 leading-relaxed [&_a]:underline [&_a]:underline-offset-4 [&_h2]:pt-6 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-tight [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
          {children}
        </div>
      </main>
      <LegalFooter />
    </div>
  );
}

export function LegalFooter() {
  return (
    <footer className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t py-6 text-sm text-muted-foreground">
      <span>© {site.name}</span>
      <Link href="/docs" className="hover:text-foreground">Docs</Link>
      <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
      <Link href="/terms" className="hover:text-foreground">Terms</Link>
    </footer>
  );
}
