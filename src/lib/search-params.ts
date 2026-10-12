import { debounce, parseAsInteger, parseAsString, parseAsStringLiteral } from "nuqs";

/** URL state shared by client components (nuqs). Defaults are left out of the URL. */

export const EVENT_TABS = ["overview", "entrances", "tickets", "scanners", "organizers", "activity"] as const;
export type EventTab = (typeof EVENT_TABS)[number];

/** `?tab=` on an event page. Each change pushes a history entry so Back walks the tabs. */
export const eventTabParser = parseAsStringLiteral(EVENT_TABS)
  .withDefault("overview")
  .withOptions({ history: "push", scroll: false });

/** `?q=` free-text search. Replaces history and waits for a typing pause. */
export const searchParser = parseAsString
  .withDefault("")
  .withOptions({ limitUrlUpdates: debounce(300) });

export const TICKET_STATUSES = ["all", "unused", "admitted", "voided"] as const;

/** `?status=` ticket filter. */
export const ticketStatusParser = parseAsStringLiteral(TICKET_STATUSES).withDefault("all");

/** `?page=` (1-based). Each change pushes history so Back returns to the previous page. */
export const pageParser = parseAsInteger.withDefault(1).withOptions({ history: "push", scroll: false });

export const EVENT_WHEN = ["upcoming", "past", "all"] as const;
export type EventWhen = (typeof EVENT_WHEN)[number];

/** `?when=` on the events list. */
export const eventWhenParser = parseAsStringLiteral(EVENT_WHEN).withDefault("upcoming");

/** `?id=` on the event pages. The id lives in the query so one static shell serves every event. */
export const eventIdParser = parseAsString.withDefault("");

/** Event page URLs. */
export const eventHref = (id: string) => `/dashboard/event?id=${encodeURIComponent(id)}`;
export const editEventHref = (id: string) => `/dashboard/event/edit?id=${encodeURIComponent(id)}`;
