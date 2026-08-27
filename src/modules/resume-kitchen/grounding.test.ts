import { describe, expect, it } from "vitest";
import {
  bulletIsSupported,
  coalesceClaims,
  countBulletLines,
  extractionLooksComplete,
  groundContact,
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
  it("keeps only project links that came from the resume", () => {
    const projectResume = `${resume}\nCampus Cart repository: https://github.com/jane/campus-cart`;
    const { kept } = groundItems(
      [
        {
          ...item([]),
          links: [
            {
              label: "GitHub",
              url: "https://github.com/jane/campus-cart",
            },
            { label: "Live demo", url: "https://invented.example.com" },
          ],
        },
      ],
      projectResume,
    );

    expect(kept[0]?.links).toEqual([
      { label: "GitHub", url: "https://github.com/jane/campus-cart" },
    ]);
  });

  it("keeps one record when a model splits one source bullet into several claims", () => {
    const source =
      "Architected an AI gateway routing 450K+ requests/day across Azure Kubernetes via Envoy, Helm, and ArgoCD";
    const claims = coalesceClaims([
      {
        type: "action",
        content: "Architected an AI gateway",
        sourceQuote: source,
      },
      {
        type: "metric",
        content: "Routed 450K+ requests/day",
        sourceQuote: source,
      },
      {
        type: "technology",
        content: "Used Envoy, Helm, and ArgoCD",
        sourceQuote: source,
      },
    ]);

    expect(claims).toEqual([
      {
        type: "metric",
        content: source,
        sourceQuote: source,
      },
    ]);
  });

  it("keeps structured education without inventing generic claim rows", () => {
    const educationResume = `
EDUCATION
Texas A&M University
Bachelor of Science in Computer Science
Minor in Math
GPA: 3.84/4.00
Coursework: Computer Architecture, Software Engineering, Data Structures & Algorithms
Expected May 2027
`;
    const { kept } = groundItems(
      [
        {
          type: "education",
          title: "Bachelor of Science in Computer Science",
          organization: "Texas A&M University",
          period: "Expected May 2027",
          summary: "",
          education: {
            degree: "Bachelor of Science",
            fieldOfStudy: "Computer Science",
            minor: "Math",
            gpa: "3.84/4.00",
            coursework: [
              "Computer Architecture",
              "Software Engineering",
              "Data Structures & Algorithms",
            ],
            honors: ["Invented honors"],
          },
          claims: [],
        },
      ],
      educationResume,
    );

    expect(kept).toHaveLength(1);
    expect(kept[0]?.claims).toEqual([]);
    expect(kept[0]?.education).toMatchObject({
      degree: "Bachelor of Science",
      fieldOfStudy: "Computer Science",
      minor: "Math",
      gpa: "3.84/4.00",
      coursework: [
        "Computer Architecture",
        "Software Engineering",
        "Data Structures & Algorithms",
      ],
      honors: [],
    });
  });

  it("keeps a claim the resume actually supports", () => {
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
    // on a real resume.
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

describe("groundContact", () => {
  it("keeps contact details present in the extracted document and drops invented ones", () => {
    const document = `${resume}\njane@example.com · Austin, TX\nLinkedIn: https://linkedin.com/in/jane`;

    expect(
      groundContact(
        {
          email: "jane@example.com",
          location: "Austin, TX",
          linkedinUrl: "https://linkedin.com/in/jane",
          githubUrl: "https://github.com/invented",
        },
        document,
      ),
    ).toEqual({
      email: "jane@example.com",
      phone: undefined,
      location: "Austin, TX",
      linkedinUrl: "https://linkedin.com/in/jane",
      githubUrl: undefined,
      websiteUrl: undefined,
    });
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

  it("accepts an extraction that found most of the resume", () => {
    expect(extractionLooksComplete(6, sixBullets)).toBe(true);
    expect(extractionLooksComplete(3, sixBullets)).toBe(true);
  });

  it("rejects one that found the education and little else", () => {
    // Exactly the reported failure: a full resume reduced to two claims.
    expect(extractionLooksComplete(2, sixBullets)).toBe(false);
  });

  it("does not demand bullets from a resume that has none", () => {
    expect(extractionLooksComplete(0, "A short prose CV.")).toBe(true);
  });
});

describe("countBulletLines on a resume that marks its bullets", () => {
  const educationHeavy = [
    "EDUCATION",
    "University of Washington                      Sep 2024 - Jun 2026",
    "Master of Science in Computer Science and Engineering, Seattle WA",
    "GPA: 3.94 | Honors: Bowen Fellowship, Outstanding TA Award",
    "Coursework: Advanced Operating Systems, Compilers, Program Analysis",
    "EXPERIENCE",
    "Compiler Engineering Intern, Silicon Forge     Jun 2025 - Sep 2025",
    "- Added a peephole optimization pass that removed 4% of emitted instructions",
    "- Fixed a register allocator bug that miscompiled nested loops under pressure",
    "- Wrote the differential test harness that gates every compiler release",
  ].join("\n");

  it("counts the marked bullets, not the coursework and honors lines", () => {
    expect(countBulletLines(educationHeavy)).toBe(3);
  });

  it("no longer calls a complete extraction incomplete", () => {
    // Three bullets read from three bullets. The old length heuristic counted
    // seven and demanded four, so this triggered a wasted second model call.
    expect(extractionLooksComplete(3, educationHeavy)).toBe(true);
  });

  it("still catches an extraction that missed most of the resume", () => {
    expect(extractionLooksComplete(1, educationHeavy)).toBe(false);
  });

  it("treats a single hyphenated line as incidental, not as a bullet style", () => {
    const oneGlyph = [
      "Built an ingestion service in Go that handled twelve upstream feeds",
      "Replaced a nightly batch job with a streaming pipeline for dashboards",
      "- Seattle, WA, and remote across two offices during the migration year",
    ].join("\n");
    expect(countBulletLines(oneGlyph)).toBe(3);
  });

  it("falls back to line length when the resume uses no bullet glyphs", () => {
    const prose = [
      "Built an ingestion service in Go that handled twelve upstream feeds",
      "Replaced a nightly batch job with a streaming pipeline for dashboards",
      "Wrote the integration test suite that gates every deploy to the tier",
    ].join("\n");
    expect(countBulletLines(prose)).toBe(3);
  });
});

describe("entries whose only evidence is a description", () => {
  const document =
    "PROJECTS\nTracelight\nA source-level profiler for Rust that attributes time to inlined frames.\n";

  const project = {
    type: "project" as const,
    title: "Tracelight",
    summary:
      "A source-level profiler for Rust that attributes time to inlined frames.",
    links: [],
    claims: [],
  };

  it("keeps a project written as a sentence rather than as bullets", () => {
    const { kept, dropped } = groundItems([project], document);
    expect(kept).toHaveLength(1);
    expect(kept[0]!.summary).toBe(project.summary);
    expect(dropped).toHaveLength(0);
  });

  it("drops a summary the resume never contained, and says so", () => {
    const { kept, dropped } = groundItems(
      [{ ...project, summary: "An award-winning profiler used by thousands." }],
      document,
    );
    // Nothing left to support the entry once the invented summary goes.
    expect(kept).toHaveLength(0);
    expect(dropped[0]!.reason).toBe("entry_unsupported");
  });

  it("keeps an entry with claims even when its summary is invented", () => {
    const { kept } = groundItems(
      [
        {
          ...project,
          summary: "An award-winning profiler used by thousands.",
          claims: [
            {
              type: "action" as const,
              content: "A source-level profiler for Rust",
              sourceQuote: "A source-level profiler for Rust",
            },
          ],
        },
      ],
      document,
    );
    expect(kept).toHaveLength(1);
    expect(kept[0]!.summary).toBe("");
  });
});

describe("links a resume writes without a scheme", () => {
  it("grounds a normalized https URL against a document that omits the scheme", () => {
    const document = "Ledger\ngithub.com/dana/ledger\n";
    const { kept } = groundItems(
      [
        {
          type: "project" as const,
          title: "Ledger",
          summary: "",
          links: [{ label: "GitHub", url: "https://github.com/dana/ledger" }],
          claims: [],
        },
      ],
      document,
    );
    expect(kept[0]!.links).toHaveLength(1);
  });

  it("still rejects a link the document never mentions", () => {
    const { kept, dropped } = groundItems(
      [
        {
          type: "project" as const,
          title: "Ledger",
          summary: "",
          links: [{ label: "GitHub", url: "https://github.com/someone/else" }],
          claims: [],
        },
      ],
      "Ledger\ngithub.com/dana/ledger\n",
    );
    expect(kept).toHaveLength(0);
    expect(dropped[0]!.reason).toBe("entry_unsupported");
  });
});
