import { site } from "@/lib/site";

/**
 * The brand stub for `next/og` images. Satori has no dotted borders,
 * so the tear line is drawn as a row of dots.
 */
export function OgStubMark({ width }: { width: number }) {
  const { chalk, graphite } = site.colors;
  const dot = Math.max(2, Math.round(width / 14));
  return (
    <div style={{ width, height: (width * 4) / 3, display: "flex", flexDirection: "column", borderRadius: width * 0.22, background: graphite }}>
      <div style={{ height: "62%" }} />
      <div style={{ display: "flex", justifyContent: "space-between", padding: `0 ${width * 0.2}px`, opacity: 0.75 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ width: dot, height: dot, borderRadius: dot, background: chalk }} />
        ))}
      </div>
    </div>
  );
}
