import { describe, expect, it } from "vitest";
import { portfolioSchema } from "./schema";

const legacyPortfolio = {
  handle: "jane-okonkwo",
  userId: "user-1",
  name: "Jane Okonkwo",
  headline: "Software engineer",
  items: [],
  published: true,
  publishedAt: "2026-08-21T00:00:00.000Z",
  updatedAt: "2026-08-21T00:00:00.000Z",
};

describe("portfolio schema", () => {
  it("keeps snapshots published before skills were added readable", () => {
    expect(portfolioSchema.parse(legacyPortfolio).skills).toEqual([]);
  });

  it("preserves grounded skill groups", () => {
    const skills = [{ category: "Languages", skills: ["TypeScript", "SQL"] }];
    expect(
      portfolioSchema.parse({ ...legacyPortfolio, skills }).skills,
    ).toEqual(skills);
  });
});
