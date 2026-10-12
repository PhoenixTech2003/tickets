/** Canonical site details shared by metadata, robots, sitemap and the manifest. */
export const site = {
  name: "Tickets",
  title: "Tickets — Issue tickets. Run the door.",
  description:
    "Issue, print and verify event tickets — online or off. Print-ready A4 sheets, offline door scanning and per-entrance checks.",
  url: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "http://localhost:3000"),
  ),
  colors: { chalk: "#f4f4f2", card: "#fafaf9", graphite: "#2b2b2a", ink: "#262625", muted: "#6b6b68", warning: "#d9a640" },
};
