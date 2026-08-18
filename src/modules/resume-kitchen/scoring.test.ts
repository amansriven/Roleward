import { describe, expect, it } from "vitest";
import {
  hasNumber,
  scoreResume,
  startsWeakly,
  vagueTermsIn,
  type ScoredClaim,
  type ScoredResume,
} from "./scoring";

const claim = (id: string, content: string): ScoredClaim => ({
  id,
  content,
  itemId: "item-1",
  itemTitle: "Datadog",
});

const resume = (
  claims: ScoredClaim[],
  patch: Partial<ScoredResume> = {},
): ScoredResume => ({
  claims,
  hasExperience: true,
  hasProjects: true,
  skillCount: 8,
  ...patch,
});

const strong = [
  claim(
    "1",
    "Shipped a log-sampling service in Go that cut ingestion costs 18%",
  ),
  claim(
    "2",
    "Migrated 34 integration tests to GitHub Actions, cutting CI to 9 minutes",
  ),
  claim(
    "3",
    "Built a Python pipeline over 2.3M records, reducing runtime to 40 minutes",
  ),
  claim("4", "Presented findings to a team of 15 engineers at the showcase"),
];

describe("the individual checks", () => {
  it("spots a bullet with no number", () => {
    expect(hasNumber("Built a marketplace backend")).toBe(false);
    expect(hasNumber("Built 12 endpoints")).toBe(true);
  });

  it("spots proximity language", () => {
    // The single most common thing between a student résumé and a callback.
    expect(startsWeakly("Helped build the migration")).toBe(true);
    expect(startsWeakly("Assisted with testing")).toBe(true);
    expect(startsWeakly("Built the migration")).toBe(false);
  });

  it("spots quantities that narrow nothing", () => {
    expect(vagueTermsIn("Worked on various services")).toContain("various");
    expect(vagueTermsIn("Shipped three services")).toEqual([]);
  });
});

describe("scoreResume", () => {
  it("rewards a résumé that quantifies and owns its work", () => {
    const score = scoreResume(resume(strong));
    expect(score.band).toBe("strong");
    expect(score.findings.filter((f) => f.severity === "high")).toEqual([]);
  });

  it("marks down proximity language and says which bullets", () => {
    const weak = [
      claim("1", "Helped build the internal dashboard used by the team"),
      claim("2", "Assisted with testing before the product launch happened"),
      claim("3", "Worked on various backend services for the platform team"),
      claim("4", "Contributed to the migration effort alongside the team"),
    ];
    const score = scoreResume(resume(weak));
    expect(score.band).toBe("needs work");
    const finding = score.findings.find((f) => f.id === "weak-openers");
    expect(finding?.claimIds).toHaveLength(4);
  });

  it("points every finding at the bullets it is about", () => {
    // The score doubles as the to-do list, so a finding with no target is
    // just criticism.
    const score = scoreResume(
      resume([...strong, claim("5", "Helped with the release process")]),
    );
    const finding = score.findings.find((f) => f.id === "weak-openers");
    expect(finding?.claimIds).toEqual(["5"]);
  });

  it("cannot be gamed by having very few bullets", () => {
    // One quantified bullet out of one is not a perfect résumé.
    const score = scoreResume(resume([claim("1", "Shipped 3 services in Go")]));
    const quantified = score.dimensions.find((d) => d.key === "quantified");
    expect(quantified!.score).toBeLessThan(quantified!.max);
  });

  it("notices the same verb over and over", () => {
    const repetitive = [
      claim("1", "Built a service that handled 400 requests per second"),
      claim("2", "Built a dashboard used by 40 people across the company"),
      claim("3", "Built a pipeline that processed 2 million records nightly"),
      claim("4", "Built a CLI tool downloaded 900 times in its first month"),
    ];
    const score = scoreResume(resume(repetitive));
    expect(score.findings.some((f) => f.id === "repeat-built")).toBe(true);
  });

  it("flags missing sections without pretending they are bullets", () => {
    const score = scoreResume(
      resume(strong, { hasProjects: false, skillCount: 0 }),
    );
    expect(score.findings.map((f) => f.id)).toContain("no-projects");
    expect(score.findings.map((f) => f.id)).toContain("no-skills");
    expect(score.findings.find((f) => f.id === "no-skills")?.claimIds).toEqual(
      [],
    );
  });

  it("sorts the worst problems first", () => {
    const score = scoreResume(
      resume([claim("1", "Helped out"), claim("2", "Did stuff")]),
    );
    expect(score.findings[0]?.severity).toBe("high");
  });

  it("survives an empty résumé without dividing by zero", () => {
    const score = scoreResume(
      resume([], { hasExperience: false, hasProjects: false, skillCount: 0 }),
    );
    expect(Number.isFinite(score.total)).toBe(true);
    expect(score.band).toBe("needs work");
  });
});
