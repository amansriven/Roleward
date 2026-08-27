import { describe, expect, it } from "vitest";
import { candidateContactSchema, publicWebUrlSchema } from "./contact";

describe("publicWebUrlSchema", () => {
  it("rejects a scheme-less URL without throwing", () => {
    // Zod v4 runs refinements after a failed base check, so a predicate that
    // calls `new URL` on unvalidated input throws straight out of safeParse.
    // This is the shape a resume header actually uses.
    for (const value of [
      "github.com/dana",
      "linkedin.com/in/dana",
      "www.dana.dev",
      "",
      "not a url at all",
    ]) {
      const parsed = publicWebUrlSchema.safeParse(value);
      expect(parsed.success).toBe(false);
    }
  });

  it("rejects non-web schemes", () => {
    expect(
      publicWebUrlSchema.safeParse("ftp://files.example.com").success,
    ).toBe(false);
    expect(publicWebUrlSchema.safeParse("javascript:alert(1)").success).toBe(
      false,
    );
  });

  it("accepts http and https", () => {
    expect(
      publicWebUrlSchema.safeParse("https://github.com/dana").success,
    ).toBe(true);
    expect(publicWebUrlSchema.safeParse("http://example.com").success).toBe(
      true,
    );
  });
});

describe("candidateContactSchema", () => {
  it("does not throw on a contact block carrying scheme-less links", () => {
    const parsed = candidateContactSchema.safeParse({
      email: "dana@example.com",
      githubUrl: "github.com/dana",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts a contact block with fully qualified links", () => {
    const parsed = candidateContactSchema.safeParse({
      email: "dana@example.com",
      githubUrl: "https://github.com/dana",
      location: "Austin, TX",
    });
    expect(parsed.success).toBe(true);
  });
});
