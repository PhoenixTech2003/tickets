const dateFmt = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });
const shortFmt = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });

/**
 * PowerSync stores timestamptz as text like "2026-11-20 18:00:00.000Z";
 * Safari can't parse the space separator, so normalise to ISO first.
 */
export const toDate = (value: string | Date) =>
  value instanceof Date ? value : new Date(value.replace(" ", "T"));

export const formatDate = (value: string | Date) => dateFmt.format(toDate(value));
export const formatTime = (value: string | Date) => timeFmt.format(toDate(value));
export const formatShortDate = (value: string | Date) => shortFmt.format(toDate(value));

/** Pass `now` from `useNow()` in components so memoised renders stay fresh. */
export function formatRelative(value: string | Date, now = Date.now()) {
  const seconds = Math.round((toDate(value).getTime() - now) / 1000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

export const percent = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);
