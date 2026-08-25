import { describe, expect, it } from "vitest";
import { applyTailoredResume } from "./tailor-resume-merge";
import type { TailorableResume, TailorScope } from "./tailor-resume-merge";

function resume(): TailorableResume {
  return {
    headline: "Backend engineer",
    skills: [
      { category: "Languages", skills: ["Python", "Go"] },
      { category: "Tools", skills: ["Docker"] },
    ],
    items: [
      {
        id: "item-1",
        evidenceItemId: "evidence-1",
        type: "experience",
        title: "Backend Intern",
        organization: "Acme",
        links: [],
        summary: "",
        bullets: [
          {
            id: "bullet-1",
            content: "Helped build an ingestion service handling 12 feeds",
            sourceClaimIds: ["claim-1"],
          },
          {
            id: "bullet-2",
            content: "Wrote tests for the billing module",
            sourceClaimIds: ["claim-2"],
          },
        ],
      },
    ],
  };
}

describe("applyTailoredResume", () => {
  it("keeps the resume's shape when the model returns a different one", () => {
    const result = applyTailoredResume(
      resume(),
      {
        headline: "",
        skills: [],
        items: [
          {
            id: "item-1",
            bullets: [
              {
                id: "bullet-1",
                content: "Built an ingestion service for 12 feeds",
              },
              { id: "invented-bullet", content: "Led the platform team" },
            ],
          },
          { id: "invented-item", bullets: [{ id: "x", content: "Anything" }] },
        ],
      },
      "",
    );

    expect(result.resume.items).toHaveLength(1);
    expect(result.resume.items[0]!.bullets.map((bullet) => bullet.id)).toEqual([
      "bullet-1",
      "bullet-2",
    ]);
    // The bullet the model never rewrote survives untouched.
    expect(result.resume.items[0]!.bullets[1]!.content).toBe(
      "Wrote tests for the billing module",
    );
    expect(result.changes).toHaveLength(1);
  });

  it("discards a rewrite that invents a number and keeps the original", () => {
    const result = applyTailoredResume(
      resume(),
      {
        headline: "",
        skills: [],
        items: [
          {
            id: "item-1",
            bullets: [
              {
                id: "bullet-1",
                content: "Built an ingestion service cutting latency 40%",
              },
            ],
          },
        ],
      },
      "",
    );

    expect(result.changes).toHaveLength(0);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0]!.inventedNumbers).toEqual(["40"]);
    expect(result.resume.items[0]!.bullets[0]!.content).toBe(
      "Helped build an ingestion service handling 12 feeds",
    );
  });

  it("accepts a number the candidate supplied as extra context", () => {
    const result = applyTailoredResume(
      resume(),
      {
        headline: "",
        skills: [],
        items: [
          {
            id: "item-1",
            bullets: [
              {
                id: "bullet-1",
                content: "Built an ingestion service cutting latency 40%",
              },
            ],
          },
        ],
      },
      "The ingestion work cut p99 latency by 40%.",
    );

    expect(result.rejected).toHaveLength(0);
    expect(result.resume.items[0]!.bullets[0]!.content).toContain("40%");
  });

  it("drops skills the candidate never listed and keeps the ones it reorders away", () => {
    const result = applyTailoredResume(
      resume(),
      {
        headline: "",
        skills: [{ category: "Languages", skills: ["Go", "Kubernetes"] }],
        items: [],
      },
      "",
    );

    expect(result.droppedSkills).toEqual(["Kubernetes"]);
    const languages = result.resume.skills.find(
      (group) => group.category === "Languages",
    );
    // Reordered as asked, but Python is not lost by being left out.
    expect(languages?.skills).toEqual(["Go", "Python"]);
    expect(
      result.resume.skills.find((group) => group.category === "Tools")?.skills,
    ).toEqual(["Docker"]);
  });

  it("keeps the original headline when a rewrite invents a figure", () => {
    const result = applyTailoredResume(
      resume(),
      {
        headline: "Backend engineer with 8 years of experience",
        skills: [],
        items: [],
      },
      "",
    );

    expect(result.resume.headline).toBe("Backend engineer");
  });
});

function scope(patch: Partial<TailorScope> = {}): TailorScope {
  return { bulletIds: [], headline: true, skills: true, ...patch };
}

describe("applyTailoredResume with a narrowed scope", () => {
  it("refuses a rewrite of a bullet the candidate did not tick", () => {
    const result = applyTailoredResume(
      resume(),
      {
        headline: "",
        skills: [],
        items: [
          {
            id: "item-1",
            bullets: [
              {
                id: "bullet-1",
                content: "Built an ingestion service for 12 feeds",
              },
              {
                id: "bullet-2",
                content: "Owned the billing module test suite",
              },
            ],
          },
        ],
      },
      "",
      scope({ bulletIds: ["bullet-2"] }),
    );

    expect(result.changes.map((change) => change.bulletId)).toEqual([
      "bullet-2",
    ]);
    expect(result.resume.items[0]!.bullets[0]!.content).toBe(
      "Helped build an ingestion service handling 12 feeds",
    );
  });

  it("leaves the headline and skills alone when they were not ticked", () => {
    const result = applyTailoredResume(
      resume(),
      {
        headline: "Payments infrastructure engineer",
        skills: [{ category: "Languages", skills: ["Go", "Python"] }],
        items: [],
      },
      "",
      scope({ bulletIds: ["bullet-1"], headline: false, skills: false }),
    );

    expect(result.resume.headline).toBe("Backend engineer");
    expect(result.resume.skills).toEqual([
      { category: "Languages", skills: ["Python", "Go"] },
      { category: "Tools", skills: ["Docker"] },
    ]);
  });

  it("treats an empty bullet list as the whole resume", () => {
    const result = applyTailoredResume(
      resume(),
      {
        headline: "",
        skills: [],
        items: [
          {
            id: "item-1",
            bullets: [
              {
                id: "bullet-1",
                content: "Built an ingestion service for 12 feeds",
              },
              {
                id: "bullet-2",
                content: "Owned the billing module test suite",
              },
            ],
          },
        ],
      },
      "",
      scope(),
    );

    expect(result.changes).toHaveLength(2);
  });

  it("still discards an invented number inside the scope", () => {
    const result = applyTailoredResume(
      resume(),
      {
        headline: "",
        skills: [],
        items: [
          {
            id: "item-1",
            bullets: [
              { id: "bullet-2", content: "Raised billing coverage to 95%" },
            ],
          },
        ],
      },
      "",
      scope({ bulletIds: ["bullet-2"] }),
    );

    expect(result.changes).toHaveLength(0);
    expect(result.rejected[0]!.inventedNumbers).toEqual(["95"]);
  });
});
