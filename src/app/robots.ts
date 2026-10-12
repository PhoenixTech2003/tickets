import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/scan", "/api", "/continue", "/pending"] },
    sitemap: new URL("/sitemap.xml", site.url).href,
  };
}
