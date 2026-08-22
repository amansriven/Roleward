import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ImageResponse } from "next/og";

export const alt =
  "Roleward — one contextualized AI workspace for your entire job search";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const lockupDataUri = `data:image/png;base64,${readFileSync(
  join(process.cwd(), "public/brand/roleward-lockup.png"),
).toString("base64")}`;

export default function OpenGraphImage() {
  return new ImageResponse(
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
        fontFamily: "sans-serif",
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
          Move forward · Go further
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            maxWidth: "900px",
            fontSize: "67px",
            lineHeight: 1.02,
            fontWeight: 750,
            letterSpacing: "-3.5px",
          }}
        >
          Your entire job search.
        </div>
        <div
          style={{
            marginTop: "8px",
            maxWidth: "980px",
            color: "#ff7a59",
            fontSize: "67px",
            lineHeight: 1.02,
            fontWeight: 750,
            letterSpacing: "-3.5px",
          }}
        >
          One contextualized AI workspace.
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
        <span>Applications · Resume · Coding · Interviews</span>
        <span style={{ color: "#f5f2ed", fontWeight: 600 }}>roleward.org</span>
      </div>
    </div>,
    size,
  );
}
