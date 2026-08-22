import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { PDFFont, PDFPage, RGB } from "pdf-lib";
import type { CandidateContact } from "@/modules/candidates/contact";
import type { ResumeVersion } from "./versions";

/**
 * Renders a resume version as a plain, single-column PDF.
 *
 * The tailored resume has to come back as a document, not a list of suggested
 * bullets, because the thing a candidate uploads to an applicant tracking
 * system is a file. That constraint decides the design: one column, standard
 * fonts, real text rather than drawn glyphs, and no tables — the layouts that
 * parse badly are the ones with two columns and text inside graphics.
 *
 * Sections appear in the order the resume itself used them. The point of this
 * feature is a document the candidate recognises as their own, so the section
 * order is read off the entries rather than imposed from a template.
 */

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 46;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const INK = rgb(0.08, 0.08, 0.09);
const MUTED = rgb(0.32, 0.32, 0.34);
const RULE = rgb(0.72, 0.72, 0.74);

const SECTION_TITLES: Record<ResumeVersion["items"][number]["type"], string> = {
  experience: "EXPERIENCE",
  project: "PROJECTS",
  education: "EDUCATION",
  leadership: "LEADERSHIP",
  activity: "ACTIVITIES",
  other: "ADDITIONAL",
};

const TRANSLITERATIONS: Record<string, string> = {
  "‘": "'",
  "’": "'",
  "‛": "'",
  "“": '"',
  "”": '"',
  "‐": "-",
  "‑": "-",
  "‒": "-",
  "–": "-",
  "—": "-",
  "―": "-",
  "•": "-",
  "▪": "-",
  "●": "-",
  "…": "...",
  "→": "->",
  " ": " ",
  " ": " ",
  " ": " ",
  "​": "",
  "﻿": "",
};

/**
 * The standard fonts encode WinAnsi and throw on anything else, and resumes
 * are full of curly quotes and en dashes from word processors. Replacing them
 * is the difference between a document and a 500.
 */
export function toWinAnsi(value: string): string {
  return [...value]
    .map((character) => {
      const mapped = TRANSLITERATIONS[character];
      if (mapped !== undefined) return mapped;
      const code = character.codePointAt(0) ?? 0;
      if (code === 9) return " ";
      if (code < 32 || (code > 126 && code < 160) || code > 255) return "";
      return character;
    })
    .join("")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/** Greedy wrap. Words wider than the column are split rather than overflowed. */
export function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  width: number,
): string[] {
  const lines: string[] = [];
  let line = "";

  const push = () => {
    if (line) lines.push(line);
    line = "";
  };

  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width) {
      line = candidate;
      continue;
    }
    push();
    if (font.widthOfTextAtSize(word, size) <= width) {
      line = word;
      continue;
    }
    let chunk = "";
    for (const character of word) {
      if (font.widthOfTextAtSize(chunk + character, size) > width) {
        lines.push(chunk);
        chunk = character;
      } else chunk += character;
    }
    line = chunk;
  }
  push();
  return lines.length ? lines : [""];
}

export interface ResumePdfInput {
  name: string;
  contact: CandidateContact | null;
  headline: string;
  skills: ResumeVersion["skills"];
  items: ResumeVersion["items"];
}

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
}

class Cursor {
  page: PDFPage;
  y = PAGE_HEIGHT - MARGIN;

  constructor(
    private readonly document: PDFDocument,
    private readonly fonts: Fonts,
  ) {
    this.page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  }

  /** Starts a new page when the next block would not fit on this one. */
  reserve(height: number) {
    if (this.y - height >= MARGIN) return;
    this.page = this.document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = PAGE_HEIGHT - MARGIN;
  }

  text(
    value: string,
    {
      size,
      font = "regular",
      color = INK,
      x = MARGIN,
      align = "left",
      width = CONTENT_WIDTH,
      lineHeight = 1.3,
    }: {
      size: number;
      font?: keyof Fonts;
      color?: RGB;
      x?: number;
      align?: "left" | "right" | "center";
      width?: number;
      lineHeight?: number;
    },
  ) {
    const face = this.fonts[font];
    const clean = toWinAnsi(value);
    if (!clean) return;
    for (const line of wrapText(clean, face, size, width)) {
      this.reserve(size * lineHeight);
      const drawn = face.widthOfTextAtSize(line, size);
      const left =
        align === "right"
          ? x + width - drawn
          : align === "center"
            ? x + (width - drawn) / 2
            : x;
      this.page.drawText(line, {
        x: left,
        y: this.y - size,
        size,
        font: face,
        color,
      });
      this.y -= size * lineHeight;
    }
  }

  /**
   * A left value and a right value sharing a baseline, as resume rows read.
   *
   * Both halves are reserved together, so a page never breaks between an
   * employer and the dates that belong to it.
   */
  row(
    left: string,
    right: string,
    {
      size,
      leftFont = "bold",
      rightFont = "regular",
      color = INK,
      rightColor = MUTED,
    }: {
      size: number;
      leftFont?: keyof Fonts;
      rightFont?: keyof Fonts;
      color?: RGB;
      rightColor?: RGB;
    },
  ) {
    const cleanLeft = toWinAnsi(left);
    const cleanRight = toWinAnsi(right);
    if (!cleanLeft && !cleanRight) return;

    const rightWidth = cleanRight
      ? this.fonts[rightFont].widthOfTextAtSize(cleanRight, size) + 12
      : 0;
    const leftWidth = CONTENT_WIDTH - rightWidth;
    const lines = cleanLeft
      ? wrapText(cleanLeft, this.fonts[leftFont], size, leftWidth).length
      : 1;
    this.reserve(size * 1.3 * lines);

    const top = this.y;
    if (cleanLeft)
      this.text(cleanLeft, {
        size,
        font: leftFont,
        color,
        width: leftWidth,
      });
    if (!cleanRight) return;
    const bottom = this.y;
    this.y = top;
    this.text(cleanRight, {
      size,
      font: rightFont,
      color: rightColor,
      align: "right",
    });
    this.y = Math.min(bottom, this.y);
  }

  /** A hanging-indent bullet, reserved whole so the dash keeps its text. */
  bullet(content: string, size: number) {
    const clean = toWinAnsi(content);
    if (!clean) return;
    const indent = 11;
    const width = CONTENT_WIDTH - indent;
    const lines = wrapText(clean, this.fonts.regular, size, width);
    this.reserve(size * 1.32 * lines.length);

    const top = this.y;
    this.text("-", { size, width: 10 });
    this.y = top;
    this.text(clean, {
      size,
      x: MARGIN + indent,
      width,
      lineHeight: 1.32,
    });
  }

  gap(height: number) {
    this.y -= height;
  }

  rule() {
    this.reserve(4);
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE_WIDTH - MARGIN, y: this.y },
      thickness: 0.7,
      color: RULE,
    });
    this.y -= 6;
  }
}

function contactLine(contact: CandidateContact | null) {
  if (!contact) return "";
  const shorten = (url?: string) =>
    url ? url.replace(/^https?:\/\//, "").replace(/\/$/, "") : undefined;
  return [
    contact.location,
    contact.email,
    contact.phone,
    shorten(contact.linkedinUrl),
    shorten(contact.githubUrl),
    shorten(contact.websiteUrl),
  ]
    .filter(Boolean)
    .join("  |  ");
}

function educationLine(item: ResumePdfInput["items"][number]) {
  const details = item.education;
  if (!details) return "";
  return [
    details.degree,
    details.fieldOfStudy,
    details.minor ? `Minor in ${details.minor}` : undefined,
    details.gpa ? `GPA ${details.gpa}` : undefined,
  ]
    .filter(Boolean)
    .join(", ");
}

/**
 * The order the sections appear in, taken from the resume rather than a
 * template — with skills placed where each kind of resume conventionally puts
 * them: under education when the resume leads with education, at the end
 * otherwise.
 */
export function sectionOrder(items: ResumePdfInput["items"]) {
  const order: ResumePdfInput["items"][number]["type"][] = [];
  for (const item of items)
    if (!order.includes(item.type)) order.push(item.type);
  return order;
}

export async function renderResumePdf(
  input: ResumePdfInput,
): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const fonts: Fonts = {
    regular: await document.embedFont(StandardFonts.Helvetica),
    bold: await document.embedFont(StandardFonts.HelveticaBold),
    italic: await document.embedFont(StandardFonts.HelveticaOblique),
  };
  document.setTitle(`${input.name || "Resume"} — Resume`);
  document.setProducer("Roleward Resume Kitchen");

  const cursor = new Cursor(document, fonts);

  cursor.text(input.name || "Resume", {
    size: 18,
    font: "bold",
    align: "center",
  });
  const contact = contactLine(input.contact);
  if (contact) {
    cursor.gap(2);
    cursor.text(contact, { size: 8.6, color: MUTED, align: "center" });
  }
  if (input.headline) {
    cursor.gap(2);
    cursor.text(input.headline, { size: 9.2, font: "italic", align: "center" });
  }
  cursor.gap(8);

  const order = sectionOrder(input.items);
  const skillsAfter =
    order[0] === "education" ? "education" : order[order.length - 1];
  const hasSkills = input.skills.some((group) => group.skills.length > 0);

  let first = true;
  const heading = (title: string) => {
    // A heading alone at the foot of a page is worse than a shorter page.
    if (!first) cursor.gap(5);
    first = false;
    cursor.reserve(38);
    cursor.text(title, { size: 10, font: "bold" });
    cursor.rule();
  };

  const drawSkills = () => {
    if (!hasSkills) return;
    heading("SKILLS");
    for (const group of input.skills) {
      if (!group.skills.length) continue;
      const label = group.category ? `${group.category}: ` : "";
      cursor.text(`${label}${group.skills.join(", ")}`, { size: 9.2 });
      cursor.gap(1.5);
    }
    cursor.gap(5);
  };

  for (const type of order) {
    heading(SECTION_TITLES[type]);

    for (const item of input.items.filter((entry) => entry.type === type)) {
      // An entry heading stranded at the foot of a page reads as a mistake.
      cursor.reserve(46);
      cursor.row(item.title, item.period ?? "", { size: 10.2 });

      const second = [item.organization, educationLine(item)]
        .filter(Boolean)
        .join(" - ");
      if (second || item.location)
        cursor.row(second, item.location ?? "", {
          size: 9.2,
          leftFont: "italic",
          rightFont: "italic",
          color: MUTED,
        });

      if (item.links.length)
        cursor.text(
          item.links
            .map(
              (link) =>
                `${link.label}: ${link.url.replace(/^https?:\/\//, "")}`,
            )
            .join("  |  "),
          { size: 8.6, color: MUTED },
        );

      if (item.education?.coursework.length)
        cursor.text(
          `Relevant coursework: ${item.education.coursework.join(", ")}`,
          { size: 8.8, color: MUTED },
        );
      if (item.education?.honors.length)
        cursor.text(`Honors: ${item.education.honors.join(", ")}`, {
          size: 8.8,
          color: MUTED,
        });

      if (item.summary) {
        cursor.gap(1.5);
        cursor.text(item.summary, { size: 9.2, color: MUTED });
      }

      cursor.gap(2);
      for (const bullet of item.bullets) {
        cursor.bullet(bullet.content, 9.4);
        cursor.gap(1.5);
      }
      cursor.gap(6);
    }

    cursor.gap(2);
    if (type === skillsAfter) drawSkills();
  }

  if (!order.length) drawSkills();

  return document.save();
}
