"use client";

import { useEffect, useEffectEvent } from "react";
import { ArrowRightIcon, BanIcon, CircleCheckBigIcon, CircleXIcon, DoorClosedIcon, HistoryIcon, SignpostIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ScanOutcome } from "@/lib/powersync/scan";
import type { ScanVerdict } from "@/lib/tickets";
import { formatTime } from "@/lib/format";
import { verdictOf, type Tone } from "@/lib/verdicts";
import { cn } from "@/lib/utils";

export const VERDICT_ICONS: Record<ScanVerdict, LucideIcon> = {
  accepted: CircleCheckBigIcon,
  wrong_entrance: SignpostIcon,
  already_used: HistoryIcon,
  invalid: CircleXIcon,
  voided: BanIcon,
  event_disabled: DoorClosedIcon,
  entrance_disabled: DoorClosedIcon,
};

const TONE_SURFACE: Record<Tone, string> = {
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  destructive: "bg-destructive text-destructive-foreground",
};

/** How long each tone stays up: admits clear fast, problems stay long enough to read and act on. */
const DISMISS_AFTER: Record<Tone, number> = { success: 4000, warning: 8000, destructive: 8000 };

/**
 * Full-bleed verdict panel: solid colour, readable at arm's length, with next
 * steps. Clears itself after a few seconds (a bar drains to show the time
 * left), or straight away when tapped.
 */
export function ScanResult({ outcome, onDismiss }: { outcome: ScanOutcome; onDismiss: () => void }) {
  const verdict = verdictOf(outcome.verdict);
  const Icon = VERDICT_ICONS[outcome.verdict];
  const duration = DISMISS_AFTER[verdict.tone];
  const dismiss = useEffectEvent(onDismiss);

  // Keyed on the duration only, so live-query re-renders don't restart the timer.
  useEffect(() => {
    const timer = setTimeout(dismiss, duration);
    return () => clearTimeout(timer);
  }, [duration]);

  return (
    <section
      role="status"
      aria-live="assertive"
      title="Tap to dismiss"
      onClick={onDismiss}
      className={cn(
        "relative animate-in cursor-pointer overflow-hidden rounded-xl p-5 duration-200 fade-in zoom-in-[0.98] motion-reduce:animate-none sm:p-8",
        TONE_SURFACE[verdict.tone],
      )}
    >
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-1 origin-left animate-drain bg-current opacity-40 motion-reduce:hidden"
        style={{ animationDuration: `${duration}ms` }}
      />
      <div className="flex items-center justify-between gap-4">
        <p className="ticket-code text-base font-medium opacity-80">{outcome.code}</p>
        <Icon className="size-8 shrink-0 sm:size-10" strokeWidth={2} />
      </div>
      <h2 className="mt-3 text-4xl leading-none font-extrabold tracking-[-0.03em] break-words min-[400px]:text-5xl sm:text-6xl">{verdict.label}</h2>
      <div className="mt-3 max-w-prose">
        <Detail outcome={outcome} />
      </div>
    </section>
  );
}

function Detail({ outcome }: { outcome: ScanOutcome }) {
  const entrance = outcome.ticketEntrance;
  switch (outcome.verdict) {
    case "accepted":
      return <p className="text-lg opacity-90">Welcome in. {entrance ? `${entrance.name} ticket.` : "Valid at any entrance."}</p>;
    case "wrong_entrance":
      return (
        <div className="space-y-3">
          <p className="text-lg">
            This ticket belongs to <strong>{entrance?.name ?? "another entrance"}</strong>.
          </p>
          <p className="flex items-center gap-2 rounded-lg bg-black/10 px-4 py-3 text-base font-semibold">
            <ArrowRightIcon className="size-5 shrink-0" />
            Please direct the guest to {entrance?.name ?? "their entrance"}
            {entrance?.description ? `: ${entrance.description}` : "."}
          </p>
        </div>
      );
    case "already_used":
      return (
        <p className="text-lg opacity-90">
          First admitted{outcome.usedAt ? ` at ${formatTime(outcome.usedAt)}` : ""}
          {outcome.usedAtEntrance ? ` through ${outcome.usedAtEntrance.name}` : ""}. Each ticket admits one guest.
        </p>
      );
    case "invalid":
      return <p className="text-lg opacity-90">No ticket with this code exists for this event. Check the code and try again.</p>;
    case "voided":
      return <p className="text-lg opacity-90">This ticket was cancelled by an organizer.</p>;
    case "event_disabled":
      return <p className="text-lg opacity-90">Admissions for this event are currently closed.</p>;
    case "entrance_disabled":
      return (
        <p className="text-lg opacity-90">
          {entrance?.name ?? "This entrance"} is closed. Ask an organizer where to send the guest.
        </p>
      );
  }
}
