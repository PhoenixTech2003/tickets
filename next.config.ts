import type { NextConfig } from "next";
import createMDX from "@next/mdx";

// Changes every deploy; the service worker is registered with it so each
// build gets a fresh worker and cache (see public/sw.js).
const buildId = process.env.VERCEL_DEPLOYMENT_ID ?? process.env.VERCEL_GIT_COMMIT_SHA ?? Date.now().toString(36);

const nextConfig: NextConfig = {
  // Docs pages under /docs are written in MDX.
  pageExtensions: ["ts", "tsx", "mdx"],
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  // Navigations and actions that fail offline wait and retry instead of erroring.
  experimental: { useOffline: true },
  env: { NEXT_PUBLIC_BUILD_ID: buildId },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
  // Event pages moved from /dashboard/events/:id to ?id= so they can be static.
  async redirects() {
    return [
      { source: "/dashboard/events/:id/edit", destination: "/dashboard/event/edit?id=:id", permanent: true },
      { source: "/dashboard/events/:id((?!new$)[^/]+)", destination: "/dashboard/event?id=:id", permanent: true },
    ];
  },
  // Per the PowerSync Next.js guide: keeps Turbopack from treating the
  // SDK's bundled assets as static image imports.
  images: { disableStaticImages: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

// Plugins are named by string so Turbopack can pass them to the loader.
export default createMDX({ options: { remarkPlugins: ["remark-gfm"] } })(nextConfig);
