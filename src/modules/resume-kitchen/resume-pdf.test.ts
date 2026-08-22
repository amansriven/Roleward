import { describe, expect, it } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import {
  renderResumePdf,
  sectionOrder,
  toWinAnsi,
  wrapText,
} from "./resume-pdf";
import type { ResumePdfInput } from "./resume-pdf";

async function helvetica() {
  const document = await PDFDocument.create();
  return document.embedFont(StandardFonts.Helvetica);
}

const input: ResumePdfInput = {
  name: "Dana Okafor",
  contact: { email: "dana@example.com", location: "Austin, TX" },
  headline: "Backend engineer",
  skills: [{ category: "Languages", skills: ["Python", "Go"] }],
  items: [
    {
      id: "edu-1",
      evidenceItemId: "edu-1",
      type: "education",
      title: "University of Texas",
      period: "Expected 2026",
      links: [],
      education: {
        degree: "BS",
        fieldOfStudy: "Computer Science",
        gpa: "3.8",
        coursework: ["Operating Systems"],
        honors: [],
      },
      summary: "",
      bullets: [],
    },
    {
      id: "item-1",
      evidenceItemId: "evidence-1",
      type: "experience",
      title: "Backend Intern",
      organization: "Acme",
      period: "Jun 2025 – Aug 2025",
      links: [],
      summary: "",
      bullets: [
        {
          id: "bullet-1",
          content: "Built an ingestion service — handling 12 feeds",
          sourceClaimIds: ["claim-1"],
        },
      ],
    },
  ],
};

describe("toWinAnsi", () => {
  it("replaces the punctuation a word processor leaves in a resume", () => {
    expect(toWinAnsi("“Led” — the team’s • work…")).toBe(
      '"Led" - the team\'s - work...',
    );
  });

  it("removes characters the standard fonts cannot encode", () => {
    expect(toWinAnsi("Shipped 日本語 builds")).toBe("Shipped builds");
  });
});

describe("wrapText", () => {
  it("keeps every line inside the column", async () => {
    const font = await helvetica();
    const lines = wrapText(
      "Built an ingestion service that handled twelve upstream feeds without losing a record",
      font,
      9.4,
      120,
    );
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines)
      expect(font.widthOfTextAtSize(line, 9.4)).toBeLessThanOrEqual(120);
  });

  it("splits a word too wide to fit rather than overflowing", async () => {
    const font = await helvetica();
    const lines = wrapText("supercalifragilistic", font, 12, 30);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines)
      expect(font.widthOfTextAtSize(line, 12)).toBeLessThanOrEqual(30);
  });
});

describe("sectionOrder", () => {
  it("follows the order the resume itself used", () => {
    expect(sectionOrder(input.items)).toEqual(["education", "experience"]);
  });
});

describe("renderResumePdf", () => {
  it("produces a one-page PDF from a resume version", async () => {
    const bytes = await renderResumePdf(input);
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
    const document = await PDFDocument.load(bytes);
    expect(document.getPageCount()).toBe(1);
  });

  it("renders a resume with no entries at all", async () => {
    const bytes = await renderResumePdf({ ...input, items: [] });
    const document = await PDFDocument.load(bytes);
    expect(document.getPageCount()).toBe(1);
  });

  it("adds pages rather than dropping entries", async () => {
    const many = Array.from({ length: 24 }, (_, index) => ({
      ...input.items[1]!,
      id: `item-${index}`,
      evidenceItemId: `evidence-${index}`,
      bullets: Array.from({ length: 4 }, (_, bullet) => ({
        id: `bullet-${index}-${bullet}`,
        content:
          "Built an ingestion service that handled twelve upstream feeds without losing a record during failover",
        sourceClaimIds: ["claim-1"],
      })),
    }));
    const document = await PDFDocument.load(
      await renderResumePdf({ ...input, items: many }),
    );
    expect(document.getPageCount()).toBeGreaterThan(1);
  });
});
