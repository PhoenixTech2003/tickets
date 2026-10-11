"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CalendarClockIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const pad = (n: number) => String(n).padStart(2, "0");

/** First 5-minute slot at or after `date`. */
function nextSlot(date: Date) {
  const next = new Date(date);
  next.setSeconds(0, 0);
  next.setMinutes(Math.ceil(next.getMinutes() / 5) * 5);
  return next < date ? new Date(next.getTime() + 5 * 60_000) : next;
}

/**
 * A trigger that opens a dialog: calendar on the left, hour and minute columns
 * on the right (tap grids on narrow screens). Picking a time before a date
 * uses today. Days, hours and minutes before `min` are disabled, and a pick
 * that would land before it is moved up to the next 5-minute slot after it.
 */
export function DateTimePicker({
  id,
  value,
  onChange,
  placeholder = "Pick a date and time",
  title = "Pick a date and time",
  clearable,
  min,
}: {
  id?: string;
  /** Dialog heading, e.g. "When does it start?" */
  title?: string;
  value: Date | undefined;
  onChange: (value: Date | undefined) => void;
  placeholder?: string;
  clearable?: boolean;
  min?: Date;
}) {
  const [open, setOpen] = useState(false);
  const columns = useRef<HTMLDivElement>(null);
  // Value when the dialog opened: Cancel, Escape and clicking outside restore it.
  const original = useRef<Date | undefined>(undefined);

  function onOpenChange(next: boolean) {
    if (next) original.current = value;
    else onChange(original.current);
    setOpen(next);
  }

  // Bring the selected hour and minute into view when the dialog opens.
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() =>
      columns.current
        ?.querySelectorAll("[data-selected=true]")
        .forEach((el) => el.scrollIntoView({ block: "center" })),
    );
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const at = (hours: number, minutes: number) => {
    const d = new Date(value ?? new Date());
    d.setHours(hours, minutes, 0, 0);
    return d;
  };
  // An hour is past once its last minute is; a minute is checked at the chosen hour.
  const hourPast = (h: number) => !!min && at(h, 59) < min;
  const minutePast = (m: number) => !!min && at(value?.getHours() ?? 0, m) < min;

  function update(change: { day?: Date; hours?: number; minutes?: number }) {
    let next = new Date(change.day ?? value ?? new Date());
    next.setHours(
      change.hours ?? value?.getHours() ?? 19,
      change.minutes ?? (value ? value.getMinutes() : 0),
      0,
      0,
    );
    if (min && next < min) next = nextSlot(min);
    onChange(next);
  }

  return (
    <div className="flex gap-2">
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className={cn("min-w-0 flex-1 justify-start font-normal", !value && "text-muted-foreground")}
          >
            <CalendarClockIcon data-icon="inline-start" />
            <span className="truncate">{value ? `${formatDate(value)}, ${formatTime(value)}` : placeholder}</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[calc(100svh-2rem)] w-auto max-w-[calc(100%-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-fit">
          <DialogHeader className="border-b px-5 pt-5 pb-4">
            <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
            <DialogDescription>
              {value ? `${formatDate(value)}, ${formatTime(value)}` : "Choose a day, then a time."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row">
            <Calendar
              mode="single"
              selected={value}
              defaultMonth={value ?? min}
              startMonth={min}
              disabled={min ? { before: min } : undefined}
              captionLayout="dropdown"
              onSelect={(day) => day && update({ day })}
              className="mx-auto bg-transparent p-3 [--cell-size:--spacing(10)]"
            />
            <div ref={columns} className="flex flex-col border-t sm:h-[22.5rem] sm:flex-row sm:border-t-0 sm:border-l">
              <TimeColumn
                label="Hour"
                options={HOURS}
                selected={value?.getHours()}
                isDisabled={hourPast}
                onSelect={(hours) => update({ hours })}
              />
              <TimeColumn
                label="Minute"
                options={MINUTES}
                selected={value?.getMinutes()}
                isDisabled={minutePast}
                onSelect={(minutes) => update({ minutes })}
                className="border-t sm:border-t-0 sm:border-l"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-3 border-t p-3">
            <TimeInput
              key={value ? `${value.getHours()}:${value.getMinutes()}` : "empty"}
              value={value}
              onSubmit={(hours, minutes) => {
                const next = at(hours, minutes);
                if (min && next < min) return "That time has already passed.";
                onChange(next);
              }}
            />
            <div className="ml-auto flex gap-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="button" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {clearable && value && (
        <Button type="button" variant="ghost" size="icon" aria-label="Clear" onClick={() => onChange(undefined)}>
          <XIcon />
        </Button>
      )}
    </div>
  );
}

const digitsOnly = (raw: string) => raw.replace(/\D/g, "").slice(0, 2);

/**
 * Typed time for anything the 5-minute columns don't offer, e.g. 19:07:
 * separate hour and minute inputs with a fixed colon between them.
 */
function TimeInput({
  value,
  onSubmit,
}: {
  value: Date | undefined;
  /** Returns an error message to reject the time. */
  onSubmit: (hours: number, minutes: number) => string | void;
}) {
  const [hh, setHh] = useState(value ? pad(value.getHours()) : "");
  const [mm, setMm] = useState(value ? pad(value.getMinutes()) : "");
  const [error, setError] = useState<string | null>(null);
  const minutesRef = useRef<HTMLInputElement>(null);
  const hoursRef = useRef<HTMLInputElement>(null);
  const id = useId();

  function commit(h = hh, m = mm) {
    if (!h && !m) return setError(null);
    if (!h || !m) return setError("Enter both the hour and the minutes.");
    const hours = Number(h);
    const minutes = Number(m);
    if (hours > 23) return setError("Hours go from 00 to 23.");
    if (minutes > 59) return setError("Minutes go from 00 to 59.");
    setError(onSubmit(hours, minutes) ?? null);
  }

  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    commit();
  };
  const fieldClass = "h-8 w-11 px-0 text-center tabular-nums";

  return (
    <div className="flex flex-col gap-1">
      <div
        className="flex items-center gap-1.5"
        onBlur={(e) => {
          // Commit once focus leaves both inputs, not when moving between them.
          if (!e.currentTarget.contains(e.relatedTarget)) commit();
        }}
      >
        <label htmlFor={`${id}-h`} className="pr-0.5 pl-1 text-sm text-muted-foreground">
          Time
        </label>
        <Input
          ref={hoursRef}
          id={`${id}-h`}
          aria-label="Hour"
          value={hh}
          inputMode="numeric"
          autoComplete="off"
          placeholder="HH"
          aria-invalid={!!error || undefined}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const next = digitsOnly(e.target.value);
            setHh(next);
            setError(null);
            if (next.length === 2) minutesRef.current?.focus();
          }}
          onKeyDown={onEnter}
          className={fieldClass}
        />
        <span aria-hidden className="font-semibold text-muted-foreground">
          :
        </span>
        <Input
          ref={minutesRef}
          aria-label="Minutes"
          value={mm}
          inputMode="numeric"
          autoComplete="off"
          placeholder="MM"
          aria-invalid={!!error || undefined}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const next = digitsOnly(e.target.value);
            setMm(next);
            setError(null);
            if (next.length === 2 && hh) commit(hh, next);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !mm) hoursRef.current?.focus();
            onEnter(e);
          }}
          className={fieldClass}
        />
      </div>
      {error && <p className="max-w-52 pl-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function TimeColumn({
  label,
  options,
  selected,
  isDisabled,
  onSelect,
  className,
}: {
  label: string;
  options: number[];
  selected: number | undefined;
  isDisabled: (value: number) => boolean;
  onSelect: (value: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <p className="px-3 pt-2 text-xs text-muted-foreground">{label}</p>
      <ScrollArea className="min-h-0 flex-1">
        <div role="listbox" aria-label={label} className="grid grid-cols-6 gap-1 p-2 sm:flex sm:flex-col">
          {options.map((option) => {
            const active = option === selected;
            return (
              <Button
                key={option}
                type="button"
                role="option"
                aria-selected={active}
                data-selected={active}
                size="sm"
                disabled={isDisabled(option)}
                variant={active ? "default" : "ghost"}
                className="tabular-nums sm:w-12"
                onClick={() => onSelect(option)}
              >
                {pad(option)}
              </Button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
