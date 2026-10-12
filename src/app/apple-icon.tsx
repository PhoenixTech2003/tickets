import { ImageResponse } from "next/og";
import { OgStubMark } from "@/components/app/og-stub-mark";
import { site } from "@/lib/site";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const { chalk } = site.colors;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: chalk }}>
        <OgStubMark width={84} />
      </div>
    ),
    size,
  );
}
