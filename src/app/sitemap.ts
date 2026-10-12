import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: site.url.href, changeFrequency: "monthly", priority: 1 },
    { url: new URL("/sign-in", site.url).href, changeFrequency: "yearly", priority: 0.5 },
  ];
}
