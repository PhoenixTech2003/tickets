/** Docs pages, in reading order. Drives the sidebar and the previous/next links. */
type DocsPage = { href: string; title: string };

export const DOCS_NAV: { group: string; pages: DocsPage[] }[] = [
  {
    group: "Start here",
    pages: [
      { href: "/docs", title: "How Tickets works" },
      { href: "/docs/getting-started", title: "Signing in & roles" },
    ],
  },
  {
    group: "Running an event",
    pages: [
      { href: "/docs/events", title: "Events" },
      { href: "/docs/entrances", title: "Entrances" },
      { href: "/docs/tickets", title: "Tickets & printing" },
      { href: "/docs/team", title: "Scanners & organizers" },
      { href: "/docs/monitoring", title: "Overview & live activity" },
    ],
  },
  {
    group: "At the door",
    pages: [
      { href: "/docs/scanning", title: "Scanning tickets" },
      { href: "/docs/scan-results", title: "Scan results explained" },
      { href: "/docs/offline-and-sync", title: "Offline & sync" },
    ],
  },
  {
    group: "Admin",
    pages: [
      { href: "/docs/people-and-roles", title: "People & roles" },
      { href: "/docs/troubleshooting", title: "Troubleshooting" },
    ],
  },
];

export const DOCS_PAGES: DocsPage[] = DOCS_NAV.flatMap((g) => g.pages);
