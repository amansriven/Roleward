import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

/**
 * Card assets live in `assets/og` rather than `node_modules` or `public`:
 * Vercel prunes node_modules in the lambda, and only project files named by
 * `outputFileTracingIncludes` are guaranteed to ship with a server trace.
 */
const assetPath = (file: string) => join(process.cwd(), "assets/og", file);

/**
 * Loaded on first render rather than at module scope. A module-level read that
 * throws takes the whole chunk down with it, which turns a missing font into a
 * failed page render instead of a failed image.
 */
let assetsPromise: Promise<{
  lockup: string;
  semiBold: Buffer;
  regular: Buffer;
}> | null = null;

function loadAssets() {
  assetsPromise ??= (async () => {
    const [lockup, semiBold, regular] = await Promise.all([
      readFile(assetPath("roleward-lockup.png")),
      readFile(assetPath("Geist-SemiBold.ttf")),
      readFile(assetPath("Geist-Regular.ttf")),
    ]);
    return {
      lockup: `data:image/png;base64,${lockup.toString("base64")}`,
      semiBold,
      regular,
    };
  })();
  return assetsPromise;
}

/**
 * Shared social card. `headline` renders in linen and `accent` in orange
 * directly beneath it, so each page can say what it actually is instead of
 * every link previewing as the homepage.
 */
export async function renderOgCard({
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
  const { lockup, semiBold, regular } = await loadAssets();

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
            src={lockup}
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
        { name: "Geist", data: semiBold, weight: 600, style: "normal" },
        { name: "Geist", data: regular, weight: 400, style: "normal" },
      ],
    },
  );
}
