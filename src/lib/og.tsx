import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ImageResponse } from "next/og";

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

const asset = (path: string) => readFileSync(join(process.cwd(), path));

const lockupDataUri = `data:image/png;base64,${asset(
  "public/brand/roleward-lockup.png",
).toString("base64")}`;

const geistSemiBold = asset(
  "node_modules/geist/dist/fonts/geist-sans/Geist-SemiBold.ttf",
);
const geistRegular = asset(
  "node_modules/geist/dist/fonts/geist-sans/Geist-Regular.ttf",
);

/**
 * Shared social card. `headline` renders in linen and `accent` in orange
 * directly beneath it, so each page can say what it actually is instead of
 * every link previewing as the homepage.
 */
export function renderOgCard({
  eyebrow,
  headline,
  accent,
  footer,
}: {
  eyebrow: string;
  headline: string;
  accent: string;
  footer: string;
}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          color: "#f5f2ed",
          background:
            "radial-gradient(circle at 78% 18%, rgba(255,122,89,.24), transparent 32%), radial-gradient(circle at 20% 100%, rgba(255,154,61,.12), transparent 34%), #0f1116",
          fontFamily: "Geist",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "2px",
          }}
        >
          {/* satori renders raw <img>; next/image is not available here */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lockupDataUri}
            width={394}
            height={85}
            alt=""
            style={{ width: "394px", height: "85px" }}
          />
          <span
            style={{
              color: "#ff9a3d",
              fontSize: "14px",
              letterSpacing: "3px",
              textTransform: "uppercase",
              marginLeft: "8px",
            }}
          >
            {eyebrow}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              maxWidth: "900px",
              fontSize: "67px",
              lineHeight: 1.02,
              fontWeight: 600,
              letterSpacing: "-3.5px",
            }}
          >
            {headline}
          </div>
          <div
            style={{
              marginTop: "8px",
              maxWidth: "980px",
              color: "#ff7a59",
              fontSize: "67px",
              lineHeight: 1.02,
              fontWeight: 600,
              letterSpacing: "-3.5px",
            }}
          >
            {accent}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: "24px",
            borderTop: "1px solid #2a2f38",
            color: "#a9aab2",
            fontSize: "18px",
          }}
        >
          <span>{footer}</span>
          <span style={{ color: "#f5f2ed", fontWeight: 600 }}>roleward.org</span>
        </div>
      </div>
    ),
    {
      ...ogSize,
      fonts: [
        { name: "Geist", data: geistSemiBold, weight: 600, style: "normal" },
        { name: "Geist", data: geistRegular, weight: 400, style: "normal" },
      ],
    },
  );
}
