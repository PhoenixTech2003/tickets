import { ImageResponse } from "next/og";
import { OgStubMark } from "@/components/app/og-stub-mark";
import { site } from "@/lib/site";

export const alt = site.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Fetches a subset of Schibsted Grotesk as TTF; falls back to the default font when offline. */
async function loadFont(weight: 500 | 800, text: string) {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@${weight}&text=${encodeURIComponent(text)}`,
    ).then((r) => r.text());
    const src = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    if (!src) return null;
    return { name: "Schibsted Grotesk", data: await fetch(src).then((r) => r.arrayBuffer()), weight } as const;
  } catch {
    return null;
  }
}

const HEADLINE = "Issue tickets. Run the door.";
const TAGLINE = "Print-ready sheets, offline door scanning and per-entrance checks.";
const TICKET = ["Admit one", "North Gate", "Lake of Stars 2026", "Sat 21 Nov, 19:30 · Sunbird Nkopola", "Ticket code", "7KQ4X9"];

export default async function OpengraphImage() {
  const { chalk, card, graphite, ink, muted } = site.colors;
  const allText = [site.name, HEADLINE, TAGLINE, ...TICKET].join("");
  const fonts = (await Promise.all([loadFont(500, allText), loadFont(800, allText)])).filter((f) => f !== null);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          padding: 72,
          gap: 64,
          alignItems: "center",
          background: chalk,
          color: ink,
          fontFamily: fonts.length ? "Schibsted Grotesk" : undefined,
        }}
      >
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <OgStubMark width={30} />
            <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1 }}>{site.name}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <span style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.02, letterSpacing: -3 }}>{HEADLINE}</span>
            <span style={{ fontSize: 30, fontWeight: 500, color: muted, lineHeight: 1.3 }}>{TAGLINE}</span>
          </div>
        </div>

        <div
          style={{
            width: 400,
            display: "flex",
            flexDirection: "column",
            borderRadius: 20,
            border: "2px solid #dddddb",
            background: card,
            overflow: "hidden",
            transform: "rotate(3deg)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 28px", background: graphite, color: chalk, fontSize: 22, fontWeight: 500 }}>
            <span>{TICKET[0]}</span>
            <span>{TICKET[1]}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "28px 28px 22px" }}>
            <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1 }}>{TICKET[2]}</span>
            <span style={{ fontSize: 20, color: muted }}>{TICKET[3]}</span>
          </div>
          <div style={{ margin: "0 28px", borderTop: "3px dashed #d2d2ce" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 28px" }}>
            <span style={{ fontSize: 20, color: muted }}>{TICKET[4]}</span>
            <span style={{ fontSize: 38, fontWeight: 800, letterSpacing: 6 }}>{TICKET[5]}</span>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
