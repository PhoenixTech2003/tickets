import type { ScanVerdict } from "@/lib/tickets";

export type Tone = "success" | "warning" | "destructive";

export const VERDICTS: Record<ScanVerdict, { label: string; tone: Tone }> = {
  accepted: { label: "Admitted", tone: "success" },
  wrong_entrance: { label: "Wrong entrance", tone: "warning" },
  already_used: { label: "Already used", tone: "destructive" },
  invalid: { label: "Invalid code", tone: "destructive" },
  voided: { label: "Voided ticket", tone: "destructive" },
  event_disabled: { label: "Event closed", tone: "destructive" },
  entrance_disabled: { label: "Entrance closed", tone: "warning" },
};

export const TONE_BADGE: Record<Tone, string> = {
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/50 bg-warning/15 text-warning-foreground dark:text-warning",
  destructive: "border-destructive/30 bg-destructive/10 text-destructive",
};

export function verdictOf(result: string) {
  return VERDICTS[result as ScanVerdict] ?? VERDICTS.invalid;
}
