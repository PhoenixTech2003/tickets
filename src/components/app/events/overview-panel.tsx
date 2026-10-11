"use client";

import { BarChart3Icon } from "lucide-react";
import { StatStrip } from "@/components/app/page-header";
import { VERDICT_ICONS } from "@/components/app/scan/scan-result";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  useAdmissionsByHour,
  useEntrances,
  useEntranceStats,
  useEvent,
  useEventStats,
  useEventValue,
  useScanOutcomes,
  useScans,
} from "@/lib/powersync/queries";
import type { ScanVerdict } from "@/lib/tickets";
import { percent, toDate } from "@/lib/format";
import { DEFAULT_CURRENCY, formatMoney } from "@/lib/money";
import { VERDICTS } from "@/lib/verdicts";
import { cn } from "@/lib/utils";
import { useNow } from "@/hooks/use-now";

const HOUR = 3600_000;
const MAX_BARS = 48;
const TONE_ICON = { success: "text-success", warning: "text-warning", destructive: "text-destructive" };
const hourFmt = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short" });

/** Headline figures, admissions over time, per-entrance progress and scan outcomes. */
export function OverviewPanel({ eventId }: { eventId: string }) {
  const now = useNow();
  const { byEvent } = useEventStats();
  const { data: recentScans } = useScans(eventId, 500);
  const stats = byEvent.get(eventId);
  const total = stats?.total ?? 0;
  const admitted = Number(stats?.admitted ?? 0);
  const voided = Number(stats?.voided ?? 0);
  const { event } = useEvent(eventId);
  const { value } = useEventValue(eventId);
  const currency = event?.currency ?? DEFAULT_CURRENCY;
  const priced = Number(value?.priced ?? 0) > 0;
  const lastHour = recentScans.filter(
    (s) => s.result === "accepted" && now - toDate(s.scanned_at).getTime() < HOUR,
  ).length;

  return (
    <div className="space-y-6">
      <StatStrip
        stats={[
          { label: "Tickets issued", value: total },
          { label: "Admitted", value: admitted, hint: `${percent(admitted, total)}%` },
          { label: "Still to arrive", value: Math.max(total - admitted - voided, 0) },
          { label: "Voided", value: voided },
          { label: "Admitted, last hour", value: lastHour, live: true },
          ...(priced
            ? [
                {
                  label: "Ticket value",
                  value: formatMoney(Number(value?.issued ?? 0), currency),
                  hint: `${formatMoney(Number(value?.admitted ?? 0), currency)} admitted`,
                },
              ]
            : []),
        ]}
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <AdmissionsChart eventId={eventId} className="xl:col-span-2" />
        <ScanOutcomes eventId={eventId} />
      </div>
      <EntranceProgress eventId={eventId} />
    </div>
  );
}

function Panel({
  title,
  description,
  className,
  children,
}: {
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-xl border bg-card p-5", className)}>
      <h2 className="font-semibold">{title}</h2>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** Round up to 1, 2, 2.5 or 5 × 10ⁿ so axis ticks land on clean numbers. */
function niceCeil(value: number) {
  if (value <= 1) return 1;
  const base = 10 ** Math.floor(Math.log10(value));
  return ([1, 2, 2.5, 5, 10].find((m) => m * base >= value) ?? 10) * base;
}

const compact = new Intl.NumberFormat(undefined, { notation: "compact" });

function AdmissionsChart({ eventId, className }: { eventId: string; className?: string }) {
  const { data } = useAdmissionsByHour(eventId);
  // Keys are UTC hours ("YYYY-MM-DD HH"); fill the gaps so empty hours show as zero.
  const counts = new Map(data.map((r) => [toDate(`${r.hour.replace(" ", "T")}:00:00Z`).getTime(), r.total]));
  const keys = [...counts.keys()];
  const bars: { at: number; total: number }[] = [];
  if (keys.length) {
    const last = Math.max(...keys);
    const first = Math.max(Math.min(...keys), last - (MAX_BARS - 1) * HOUR);
    for (let at = first; at <= last; at += HOUR) bars.push({ at, total: counts.get(at) ?? 0 });
  }
  return (
    <Panel
      title="Admissions by hour"
      description="Guests admitted in each hour, in your time zone."
      className={className}
    >
      <HourlyChart bars={bars} />
    </Panel>
  );
}

/** Single-series column chart of admissions per hour, with hover tooltips and a screen-reader table. */
export function HourlyChart({ bars }: { bars: { at: number; total: number }[] }) {
  const peak = Math.max(0, ...bars.map((b) => b.total));
  const top = niceCeil(peak);
  const labelEvery = Math.ceil(bars.length / 8);
  const spansDays = bars.length > 0 && dayFmt.format(bars[0].at) !== dayFmt.format(bars[bars.length - 1].at);

  return bars.length === 0 ? (
    <Empty className="py-10">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BarChart3Icon />
        </EmptyMedia>
        <EmptyTitle>No one admitted yet</EmptyTitle>
        <EmptyDescription>Bars appear here as tickets are scanned in.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  ) : (
    <>
      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
        <div
          aria-hidden
          className="flex h-48 flex-col justify-between pb-px text-right text-xs text-muted-foreground tabular-nums"
        >
          <span className="-translate-y-1/2">{compact.format(top)}</span>
          <span>{compact.format(top / 2)}</span>
          <span className="translate-y-1/2">0</span>
        </div>
        <div className="relative h-48 flex-1">
          {/* Recessive hairline grid at 0, half and top. */}
          <div aria-hidden className="absolute inset-0 flex flex-col justify-between">
            <div className="border-t" />
            <div className="border-t" />
            <div className="border-t border-foreground/25" />
          </div>
          <div className="absolute inset-0 flex items-end gap-0.5">
            {bars.map((bar) => {
              const isPeak = bar.total === peak && peak > 0;
              const label = `${hourFmt.format(bar.at)}–${hourFmt.format(bar.at + HOUR)}${spansDays ? `, ${dayFmt.format(bar.at)}` : ""}`;
              return (
                <Tooltip key={bar.at}>
                  <TooltipTrigger asChild>
                    <div
                      tabIndex={0}
                      aria-label={`${bar.total} admitted, ${label}`}
                      className="group relative flex h-full min-w-0 flex-1 items-end justify-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div
                        className="w-full max-w-6 rounded-t-[4px] bg-primary transition-opacity group-hover:opacity-75 group-focus-visible:opacity-75"
                        style={{ height: `${(bar.total / top) * 100}%` }}
                      />
                      {isPeak && (
                        <span
                          className="absolute text-xs font-medium"
                          style={{ bottom: `calc(${(bar.total / top) * 100}% + 4px)` }}
                        >
                          {bar.total}
                        </span>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <span className="font-semibold">{bar.total.toLocaleString()} admitted</span>
                    <span className="opacity-70"> · {label}</span>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
        <div aria-hidden />
        <div aria-hidden className="flex gap-0.5 text-xs text-muted-foreground tabular-nums">
          {bars.map((bar, i) => (
            <span key={bar.at} className="min-w-0 flex-1 text-center whitespace-nowrap">
              {i % labelEvery === 0 ? hourFmt.format(bar.at) : ""}
            </span>
          ))}
        </div>
      </div>
      <table className="sr-only">
        <caption>Guests admitted per hour</caption>
        <thead>
          <tr>
            <th scope="col">Hour starting</th>
            <th scope="col">Admitted</th>
          </tr>
        </thead>
        <tbody>
          {bars.map((bar) => (
            <tr key={bar.at}>
              <td>{`${dayFmt.format(bar.at)} ${hourFmt.format(bar.at)}`}</td>
              <td>{bar.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function ScanOutcomes({ eventId }: { eventId: string }) {
  const { data } = useScanOutcomes(eventId);
  const byResult = new Map(data.map((r) => [r.result, r.total]));
  const totalScans = data.reduce((sum, r) => sum + r.total, 0);
  const verdicts = Object.keys(VERDICTS) as ScanVerdict[];

  return (
    <Panel title="Scan outcomes" description={`${totalScans.toLocaleString()} scans in total.`}>
      <ul className="divide-y">
        {verdicts.map((verdict) => {
          const Icon = VERDICT_ICONS[verdict];
          const { label, tone } = VERDICTS[verdict];
          const count = byResult.get(verdict) ?? 0;
          return (
            <li
              key={verdict}
              className={cn("flex items-center gap-3 py-2.5 text-sm", count === 0 && "text-muted-foreground")}
            >
              <Icon className={cn("size-4 shrink-0", count > 0 ? TONE_ICON[tone] : "opacity-50")} />
              <span className="flex-1">{label}</span>
              <span className="font-medium tabular-nums">{count.toLocaleString()}</span>
              <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
                {percent(count, totalScans)}%
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

function EntranceProgress({ eventId }: { eventId: string }) {
  const { data: entrances } = useEntrances(eventId);
  const { data: stats } = useEntranceStats(eventId);
  const byEntrance = new Map(stats.map((s) => [s.entranceId, s]));
  const rows = [
    ...entrances.map((e) => ({ id: e.id, name: e.name, closed: e.disabled === 1, stats: byEntrance.get(e.id) })),
    ...(byEntrance.has(null) ? [{ id: "any", name: "Any entrance", closed: false, stats: byEntrance.get(null) }] : []),
  ];

  return (
    <Panel title="Arrivals by entrance" description="Admitted guests against tickets issued for each door.">
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tickets issued yet.</p>
      ) : (
        <ul className="grid gap-x-10 gap-y-5 md:grid-cols-2">
          {rows.map(({ id, name, closed, stats }) => {
            const total = stats?.total ?? 0;
            const admitted = Number(stats?.admitted ?? 0);
            const pct = percent(admitted, total);
            return (
              <li key={id} className="space-y-2">
                <div className="flex items-baseline gap-2 text-sm">
                  <span className="truncate font-medium">{name}</span>
                  {closed && <Badge variant="outline">Closed</Badge>}
                  <span className="ml-auto text-muted-foreground tabular-nums">
                    {admitted.toLocaleString()} of {total.toLocaleString()}
                  </span>
                  <span className="w-10 text-right font-medium tabular-nums">{pct}%</span>
                </div>
                <div
                  role="meter"
                  aria-label={`${name} arrivals`}
                  aria-valuemin={0}
                  aria-valuemax={total}
                  aria-valuenow={admitted}
                  className="h-2 overflow-hidden rounded-full bg-primary/12"
                >
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
