import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: site.url.href, changeFrequency: "monthly", priority: 1 },
    { url: new URL("/sign-in", site.url).href, changeFrequency: "yearly", priority: 0.5 },
    { url: new URL("/docs", site.url).href, changeFrequency: "monthly", priority: 0.6 },
    { url: new URL("/privacy", site.url).href, changeFrequency: "yearly", priority: 0.3 },
    { url: new URL("/terms", site.url).href, changeFrequency: "yearly", priority: 0.3 },
  ];
}
