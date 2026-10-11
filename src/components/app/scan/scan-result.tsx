"use client";

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

/** Full-bleed verdict panel: solid colour, readable at arm's length, with next steps. */
export function ScanResult({ outcome }: { outcome: ScanOutcome }) {
  const verdict = verdictOf(outcome.verdict);
  const Icon = VERDICT_ICONS[outcome.verdict];

  return (
    <section
      role="status"
      aria-live="assertive"
      className={cn(
        "animate-in fade-in zoom-in-[0.98] rounded-xl p-6 duration-200 motion-reduce:animate-none sm:p-8",
        TONE_SURFACE[verdict.tone],
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <p className="ticket-code text-base font-medium opacity-80">{outcome.code}</p>
        <Icon className="size-8 shrink-0 sm:size-10" strokeWidth={2} />
      </div>
      <h2 className="mt-3 text-5xl leading-none font-extrabold tracking-[-0.03em] sm:text-6xl">{verdict.label}</h2>
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
