import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const { chalk, graphite } = site.colors;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: chalk }}>
        <div style={{ width: 84, height: 120, display: "flex", flexDirection: "column", borderRadius: 18, background: graphite }}>
          <div style={{ height: "62%" }} />
          <div style={{ margin: "0 14px", borderTop: `6px dotted ${chalk}`, opacity: 0.75 }} />
        </div>
      </div>
    ),
    size,
  );
}
