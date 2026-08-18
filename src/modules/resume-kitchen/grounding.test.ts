import { describe, expect, it } from "vitest";
import {
  bulletIsSupported,
  countBulletLines,
  extractionLooksComplete,
  groundItems,
  quoteAppearsIn,
  type DraftItem,
} from "./grounding";

const resume = `
JANE OKONKWO
Campus Cart — Independent project
Built backend API endpoints using Node.js and PostgreSQL.
Grew the marketplace to 812 monthly student users.
CodePath — Teaching assistant, led weekly sessions for 30 students.
`;

const item = (claims: DraftItem["claims"]): DraftItem => ({
  type: "project",
  title: "Campus Cart",
  organization: "Independent project",
  summary: "A campus marketplace.",
  claims,
});

describe("quoteAppearsIn", () => {
  it("accepts a quote that is in the document", () => {
    expect(
      quoteAppearsIn("Built backend API endpoints using Node.js", resume),
    ).toBe(true);
  });

  it("tolerates the whitespace a PDF extractor introduces", () => {
    expect(quoteAppearsIn("Built   backend\nAPI  endpoints", resume)).toBe(
      true,
    );
  });

  it("rejects a quote that is not there", () => {
    expect(quoteAppearsIn("Reduced median response time by 38%", resume)).toBe(
      false,
    );
  });

  it("rejects a quote too short to mean anything", () => {
    expect(quoteAppearsIn("Node", resume)).toBe(false);
  });

  it("does not stitch words together from across the document", () => {
    // "Built" and "students" both appear, but nowhere near each other.
    expect(quoteAppearsIn("Built sessions students marketplace", resume)).toBe(
      false,
    );
  });

  it("survives a word the PDF extractor split across a line", () => {
    // Verbatim from a real extraction: "Machine Lea\nrning".
    const mangled = "Relevant Coursework: Algorithms, Machine Lea\nrning";
    expect(
      quoteAppearsIn(
        "Relevant Coursework: Algorithms, Machine Learning",
        mangled,
      ),
    ).toBe(true);
  });

  it("survives a bullet wrapped across two lines", () => {
    const wrapped =
      "\u2022 Collaborated with two senior engineers to migrate 34 tests,\n  cutting CI runtime from 22 minutes to 9 minutes";
    expect(
      quoteAppearsIn(
        "Collaborated with two senior engineers to migrate 34 tests, cutting CI runtime from 22 minutes to 9 minutes",
        wrapped,
      ),
    ).toBe(true);
  });

  it("still rejects a sentence that was never written", () => {
    // The safety property has to survive the tolerance added for PDFs.
    expect(
      quoteAppearsIn(
        "Led a team of twelve engineers across four countries",
        resume,
      ),
    ).toBe(false);
  });
});

describe("groundItems", () => {
  it("keeps a claim the résumé actually supports", () => {
    const { kept, dropped } = groundItems(
      [
        item([
          {
            type: "action",
            content: "Built backend API endpoints using Node.js and PostgreSQL",
            sourceQuote:
              "Built backend API endpoints using Node.js and PostgreSQL.",
          },
        ]),
      ],
      resume,
    );
    expect(kept).toHaveLength(1);
    expect(dropped).toHaveLength(0);
  });

  it("drops a claim whose quote is not in the document", () => {
    const { kept, dropped } = groundItems(
      [
        item([
          {
            type: "metric",
            content: "Reduced median API response time by 38%",
            sourceQuote: "Reduced median API response time by 38%.",
          },
        ]),
      ],
      resume,
    );
    expect(kept).toHaveLength(0);
    expect(dropped[0]?.reason).toBe("quote_not_in_document");
  });

  it("drops a number the source quote never contained", () => {
    // The dangerous case: a real line, inflated. The candidate confirms it
    // because the sentence looks like theirs, and it is now a fabricated metric
    // on a real résumé.
    const { kept, dropped } = groundItems(
      [
        item([
          {
            type: "metric",
            content: "Grew the marketplace to 8,120 monthly student users",
            sourceQuote: "Grew the marketplace to 812 monthly student users.",
          },
        ]),
      ],
      resume,
    );
    expect(kept).toHaveLength(0);
    expect(dropped[0]?.reason).toContain("number_not_in_source");
  });

  it("keeps a number that is genuinely in the source", () => {
    const { kept } = groundItems(
      [
        item([
          {
            type: "metric",
            content: "Grew to 812 monthly student users",
            sourceQuote: "Grew the marketplace to 812 monthly student users.",
          },
        ]),
      ],
      resume,
    );
    expect(kept).toHaveLength(1);
  });

  it("does not mistake a sentence-ending period for part of a number", () => {
    // Caught against a real extraction: "expected 2026" came back as
    // "Expected graduation in 2026." and was dropped as an invented number.
    const { kept } = groundItems(
      [
        item([
          {
            type: "outcome",
            content: "Led weekly sessions for 30 students.",
            sourceQuote:
              "CodePath — Teaching assistant, led weekly sessions for 30 students.",
          },
        ]),
      ],
      resume,
    );
    expect(kept).toHaveLength(1);
  });

  it("discards an item once every claim under it has been dropped", () => {
    const { kept } = groundItems(
      [
        item([
          {
            type: "outcome",
            content: "Raised a seed round",
            sourceQuote: "Raised a seed round of $2M.",
          },
        ]),
      ],
      resume,
    );
    expect(kept).toHaveLength(0);
  });
});

describe("bulletIsSupported", () => {
  const claims = [
    "Migrated 12 REST endpoints from Express to Fastify",
    "Cut p95 latency by 22%",
  ];

  it("allows a rewrite that only rephrases what the evidence says", () => {
    // Rewording is the point of tailoring; only new quantities are forbidden.
    expect(
      bulletIsSupported(
        "Migrated 12 REST endpoints to Fastify, cutting p95 latency 22%",
        claims,
      ).ok,
    ).toBe(true);
  });

  it("catches a number the evidence never contained", () => {
    const check = bulletIsSupported(
      "Migrated 40 REST endpoints to Fastify, cutting p95 latency 22%",
      claims,
    );
    expect(check.ok).toBe(false);
    expect(check.inventedNumbers).toContain("40");
  });

  it("catches an inflated version of a real number", () => {
    expect(
      bulletIsSupported("Cut p95 latency by 82%", claims).inventedNumbers,
    ).toContain("82");
  });

  it("passes a bullet with no numbers at all", () => {
    expect(
      bulletIsSupported("Migrated REST endpoints to Fastify", claims).ok,
    ).toBe(true);
  });
});

describe("extractionLooksComplete", () => {
  const sixBullets = [
    "EXPERIENCE",
    "Datadog - Software Engineering Intern",
    "• Designed and shipped a log-sampling service in Go that cut costs 18%",
    "• Migrated 34 integration tests from Jenkins to GitHub Actions this summer",
    "• Presented findings to a team of fifteen engineers at the showcase",
    "PROJECTS",
    "• Built a study scheduling app used by 450 students across four campuses",
    "• Implemented real-time sync with WebSockets for concurrent connections",
    "• Created a CLI tool that tracks coding practice streaks over time",
  ].join("\n");

  it("counts described achievements, not headings or dates", () => {
    expect(countBulletLines(sixBullets)).toBe(6);
  });

  it("accepts an extraction that found most of the résumé", () => {
    expect(extractionLooksComplete(6, sixBullets)).toBe(true);
    expect(extractionLooksComplete(3, sixBullets)).toBe(true);
  });

  it("rejects one that found the education and little else", () => {
    // Exactly the reported failure: a full résumé reduced to two claims.
    expect(extractionLooksComplete(2, sixBullets)).toBe(false);
  });

  it("does not demand bullets from a résumé that has none", () => {
    expect(extractionLooksComplete(0, "A short prose CV.")).toBe(true);
  });
});
