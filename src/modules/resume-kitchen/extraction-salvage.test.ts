import { describe, expect, it } from "vitest";
import { salvageItems } from "./extraction-salvage";

function entry(patch: Record<string, unknown> = {}) {
  return {
    type: "experience",
    title: "Backend Intern",
    organization: "Acme Analytics",
    period: "Jun 2025 - Aug 2025",
    location: "Remote",
    links: [],
    education: null,
    summary: "",
    claims: [{ sourceQuote: "Built an ingestion service" }],
    ...patch,
  };
}

describe("salvageItems", () => {
  it("keeps the rest of the resume when one entry has a blank title", () => {
    // The exact shape that used to reject the whole document: strict JSON
    // schemas make the model return "" for anything the resume does not say,
    // and it applied that to a title.
    const { items, unusable } = salvageItems([
      entry(),
      entry({ title: "", organization: "Hack the North" }),
      entry({ title: "Ledger", type: "project", organization: "" }),
    ]);

    expect(items).toHaveLength(3);
    expect(unusable).toHaveLength(0);
    // The organization was promoted rather than repeated beside itself.
    expect(items[1]!.title).toBe("Hack the North");
    expect(items[1]!.organization).toBeUndefined();
  });

  it("titles an untitled education entry from its degree", () => {
    const { items } = salvageItems([
      entry({
        type: "education",
        title: "",
        organization: "The University of Texas at Austin",
        education: {
          degree: "B.S.",
          fieldOfStudy: "Computer Science",
          minor: "",
          gpa: "3.8",
          coursework: [],
          honors: [],
        },
        claims: [],
      }),
    ]);

    expect(items[0]!.title).toBe("B.S., Computer Science");
    expect(items[0]!.organization).toBe("The University of Texas at Austin");
    expect(items[0]!.education?.gpa).toBe("3.8");
  });

  it("drops only the entry that has no usable label at all", () => {
    const { items, unusable } = salvageItems([
      entry(),
      entry({ title: "", organization: "" }),
    ]);

    expect(items).toHaveLength(1);
    expect(unusable).toHaveLength(1);
    expect(unusable[0]!.reason).toBe("entry_untitled");
  });

  it("drops a malformed link without losing the entry it was attached to", () => {
    const { items, unusable } = salvageItems([
      entry({
        type: "project",
        links: [
          { label: "GitHub", url: "github.com/dana/ledger" },
          { label: "Live demo", url: "https://ledger.example.com" },
        ],
      }),
    ]);

    expect(items).toHaveLength(1);
    expect(items[0]!.links).toEqual([
      { label: "Live demo", url: "https://ledger.example.com" },
    ]);
    expect(unusable).toHaveLength(0);
  });

  it("drops a blank claim without losing its sibling claims", () => {
    const { items } = salvageItems([
      entry({
        claims: [
          { sourceQuote: "" },
          { sourceQuote: "Wrote the integration tests" },
        ],
      }),
    ]);

    expect(items[0]!.claims).toHaveLength(1);
    expect(items[0]!.claims[0]!.content).toBe("Wrote the integration tests");
  });

  it("reports an entry it could not parse at all, and keeps going", () => {
    const { items, unusable } = salvageItems([
      { type: "not-a-real-type", title: "Something" },
      entry(),
    ]);

    expect(items).toHaveLength(1);
    expect(unusable[0]!.reason).toContain("entry_unparseable");
  });
});

describe("claims derived from their quote", () => {
  it("strips the bullet glyph and classifies by whether a figure is present", () => {
    const { items } = salvageItems([
      entry({
        claims: [
          { sourceQuote: "• Cut p95 latency by 22% across 40 endpoints" },
          { sourceQuote: "- Wrote the integration test suite" },
        ],
      }),
    ]);

    expect(items[0]!.claims[0]!.content).toBe(
      "Cut p95 latency by 22% across 40 endpoints",
    );
    expect(items[0]!.claims[0]!.type).toBe("metric");
    expect(items[0]!.claims[1]!.content).toBe(
      "Wrote the integration test suite",
    );
    expect(items[0]!.claims[1]!.type).toBe("action");
    // The quote itself is untouched: grounding checks it against the document.
    expect(items[0]!.claims[1]!.sourceQuote).toBe(
      "- Wrote the integration test suite",
    );
  });

  it("drops a quote that is nothing but a glyph", () => {
    const { items } = salvageItems([
      entry({ claims: [{ sourceQuote: "-" }, { sourceQuote: "Shipped it" }] }),
    ]);
    expect(items[0]!.claims).toHaveLength(1);
  });
});
