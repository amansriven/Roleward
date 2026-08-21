import { ImageResponse } from "next/og";

export const alt =
  "Roleward — one contextualized AI workspace for your entire job search";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
          alignItems: "center",
          gap: "22px",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "78px",
            height: "78px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid rgba(255,122,89,.45)",
            borderRadius: "20px",
            background:
              "linear-gradient(145deg, rgba(31,34,42,.96), rgba(15,17,22,.98))",
            boxShadow: "0 18px 50px rgba(0,0,0,.3)",
          }}
        >
          <span
            style={{
              fontSize: "50px",
              lineHeight: 1,
              fontWeight: 800,
              letterSpacing: "-8px",
              transform: "translateX(-3px)",
            }}
          >
            R
          </span>
          <span
            style={{
              position: "absolute",
              right: "10px",
              top: "7px",
              color: "#ff7a59",
              fontSize: "31px",
              fontWeight: 800,
            }}
          >
            ↗
          </span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <span style={{ fontSize: "31px", fontWeight: 700 }}>Roleward</span>
          <span
            style={{
              color: "#ff9a3d",
              fontSize: "14px",
              letterSpacing: "3px",
              textTransform: "uppercase",
            }}
          >
            Move forward · Go further
          </span>
        </div>
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
