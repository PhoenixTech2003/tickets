import { cn } from "@/lib/utils";

/** Illustration of a printed ticket stub, matching the A4 PDF layout. */
export function ShowcaseTicket({ className }: { className?: string }) {
  return (
    <div className={cn("w-full max-w-sm overflow-hidden rounded-xl border bg-card text-card-foreground", className)}>
      <div className="flex items-center justify-between bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
        <span>Admit one</span>
        <span>North Gate</span>
      </div>
      <div className="space-y-1 px-5 pt-5 pb-4">
        <p className="text-xl font-bold tracking-tight">Lake of Stars 2026</p>
        <p className="text-sm text-muted-foreground">Sat 21 Nov, 19:30 · Sunbird Nkopola</p>
      </div>
      <div className="perforation mx-5" />
      <div className="flex items-center justify-between px-5 py-4">
        <span className="text-sm text-muted-foreground">Ticket code</span>
        <span className="ticket-code text-2xl font-semibold">7KQ4X9</span>
      </div>
    </div>
  );
}

/** Illustration of the scanner's verdict for a guest at the wrong door. */
export function ShowcaseVerdict({ className }: { className?: string }) {
  return (
    <div className={cn("w-full max-w-sm rounded-xl bg-warning px-5 py-4 text-warning-foreground", className)}>
      <p className="ticket-code text-sm opacity-80">7KQ4X9</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">Wrong entrance</p>
      <p className="mt-1 text-sm">Send the guest to North Gate, past the main car park.</p>
    </div>
  );
}
