"use client";

import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { EntranceRow } from "@/lib/powersync/schema";

const ANY = "__any__";

/** Entrance picker where "Any entrance" maps to `null`. */
export function EntranceSelect({
  entrances,
  value,
  onChange,
  anyLabel = "Any entrance",
  id,
  ariaLabel,
  className,
  disabled,
}: {
  entrances: EntranceRow[];
  value: string | null;
  onChange: (value: string | null) => void;
  anyLabel?: string;
  id?: string;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Select value={value ?? ANY} onValueChange={(v) => onChange(v === ANY ? null : v)} disabled={disabled}>
      <SelectTrigger id={id} aria-label={ariaLabel} className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ANY}>{anyLabel}</SelectItem>
        {entrances.length > 0 && <SelectSeparator />}
        {entrances.map((e) => (
          <SelectItem key={e.id} value={e.id} disabled={e.disabled === 1}>
            {e.name}
            {e.disabled === 1 && " (disabled)"}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
