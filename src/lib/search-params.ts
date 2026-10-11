import { debounce, parseAsString, parseAsStringLiteral } from "nuqs";

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
