import type { Metadata } from "next";
import { Brand } from "@/components/app/brand";
import { ShowcaseTicket, ShowcaseVerdict } from "@/components/app/showcase-ticket";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { GoogleSignInButton } from "./google-button";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col px-6 py-5 sm:px-10">
        <div className="flex items-center justify-between">
          <Brand />
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-7 py-16">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Sign in</h1>
            <p className="text-muted-foreground">
              Use your Google account. What you can do here, whether admin, organizer or scanner, is set by your
              team.
            </p>
          </div>
          <GoogleSignInButton />
          <p className="text-sm text-muted-foreground">
            New here? Signing in creates your account, and an admin or organizer then gives you access.
          </p>
        </div>
      </div>
      <div aria-hidden className="relative hidden items-center justify-center border-l bg-sidebar lg:flex">
        <div className="w-full max-w-sm">
          <ShowcaseTicket />
          <ShowcaseVerdict className="relative -mt-3 ml-auto w-[88%] shadow-xl shadow-foreground/10" />
        </div>
      </div>
    </div>
  );
}
