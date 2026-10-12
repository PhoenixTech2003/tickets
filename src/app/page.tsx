import { Suspense } from "react";
import Link from "next/link";
import { PrinterIcon, ShieldCheckIcon, WifiOffIcon } from "lucide-react";
import { Brand } from "@/components/app/brand";
import { LegalFooter } from "@/components/app/legal-page";
import { ShowcaseTicket, ShowcaseVerdict } from "@/components/app/showcase-ticket";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { redirect } from "next/navigation";
import { getViewer, homePathFor } from "@/server/auth/viewer";

const FEATURES = [
  { icon: WifiOffIcon, title: "Scans offline", body: "Door devices verify codes from a synced local copy, then reconcile when the signal returns." },
  { icon: PrinterIcon, title: "Print-ready", body: "Two-column A4 sheets, ten stubs per page, each with a six-character code." },
  { icon: ShieldCheckIcon, title: "Right door, every time", body: "Guests at the wrong entrance are redirected by name, and every ticket admits once." },
];

// Static shell: everything except the session-aware CTA prerenders.
export default function LandingPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 sm:px-6">
      <header className="flex items-center justify-between py-5">
        <Brand />
        <div className="flex items-center gap-1.5">
          <Button asChild variant="ghost" size="sm">
            <Link href="/docs">Docs</Link>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <main className="grid flex-1 items-center gap-14 py-12 lg:grid-cols-[1.15fr_1fr] lg:py-20">
        <section className="space-y-7">
          <h1 className="max-w-xl text-5xl leading-[1.02] font-extrabold tracking-[-0.035em] text-balance sm:text-6xl">
            Issue tickets. Run the door.
          </h1>
          <p className="max-w-md text-lg text-muted-foreground text-pretty">
            Create events, map entrances, print tickets and check guests in with scanning that keeps working when the
            signal drops.
          </p>
          <Suspense fallback={<Skeleton className="h-11 w-56 rounded-lg" />}>
            <SessionCta />
          </Suspense>
        </section>
        <section aria-hidden className="mx-auto w-full max-w-sm">
          <ShowcaseTicket />
          <ShowcaseVerdict className="relative -mt-3 ml-auto w-[88%] shadow-xl shadow-foreground/10" />
        </section>
      </main>

      <footer className="grid gap-8 border-t py-10 sm:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div key={title} className="space-y-2">
            <Icon className="size-5" />
            <h2 className="font-semibold">{title}</h2>
            <p className="max-w-xs text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </footer>
      <LegalFooter />
    </div>
  );
}

async function SessionCta() {
  const viewer = await getViewer();
  // Signed-in users with no access yet belong on the "ask for access" page, not here.
  if (viewer && (await homePathFor(viewer)) === "/pending") redirect("/pending");
  return (
    <Button asChild size="lg" className="h-11 rounded-lg px-5 text-base">
      <Link href={viewer ? "/continue" : "/sign-in"}>
        {viewer ? `Continue as ${viewer.name.split(" ")[0]}` : "Sign in with Google"}
      </Link>
    </Button>
  );
}
