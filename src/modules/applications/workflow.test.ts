import { describe, expect, it } from "vitest";
import { extractRequirements, matchRequirements } from "./workflow";

describe("application workflow", () => {
  it("extracts version-safe requirement records", () => {
    const requirements = extractRequirements(
      "We need a backend engineer to build Node APIs, work with PostgreSQL databases, collaborate with a cross-functional team, and apply strong algorithms to scalable services.",
    );
    expect(requirements.length).toBeGreaterThanOrEqual(3);
    expect(requirements.every((item) => item.confirmed === false)).toBe(true);
  });

  it("matches only confirmed evidence claims", () => {
    const requirements = extractRequirements(
      "Build Node backend APIs and scalable services with PostgreSQL database experience and strong algorithms. Collaborate across the team.",
    ).map((item) => ({ ...item, confirmed: true }));
    const matched = matchRequirements(requirements, [
      {
        id: "project",
        type: "project",
        title: "Campus API",
        links: [],
        summary: "Backend service",
        verificationStatus: "confirmed",
        claims: [
          {
            id: "confirmed",
            type: "technology",
            content: "Built Node backend APIs",
            verificationStatus: "confirmed",
          },
          {
            id: "proposed",
            type: "metric",
            content: "PostgreSQL database",
            verificationStatus: "proposed",
          },
        ],
      },
    ]);
    expect(
      matched.some((item) => item.supportingClaimIds.includes("confirmed")),
    ).toBe(true);
    expect(
      matched.every((item) => !item.supportingClaimIds.includes("proposed")),
    ).toBe(true);
  });
});
