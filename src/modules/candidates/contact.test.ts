import { describe, expect, it } from "vitest";
import {
  candidateContactSchema,
  publicWebUrlSchema,
  withWebScheme,
} from "./contact";

describe("withWebScheme", () => {
  it("supplies https for the way a resume actually writes a profile", () => {
    expect(withWebScheme("github.com/dana")).toBe("https://github.com/dana");
    expect(withWebScheme("linkedin.com/in/dana")).toBe(
      "https://linkedin.com/in/dana",
    );
    expect(withWebScheme("www.dana.dev")).toBe("https://www.dana.dev");
    expect(withWebScheme("  dana.dev/work  ")).toBe("https://dana.dev/work");
  });

  it("leaves anything that already declares a scheme alone", () => {
    // Rewriting these would turn a value the check rejects into one it accepts.
    expect(withWebScheme("http://example.com")).toBe("http://example.com");
    expect(withWebScheme("https://example.com")).toBe("https://example.com");
    expect(withWebScheme("ftp://files.example.com")).toBe(
      "ftp://files.example.com",
    );
    expect(withWebScheme("javascript:alert(1)")).toBe("javascript:alert(1)");
    expect(withWebScheme("mailto:dana@example.com")).toBe(
      "mailto:dana@example.com",
    );
  });

  it("leaves anything that does not look like a host alone", () => {
    expect(withWebScheme("not a url at all")).toBe("not a url at all");
    expect(withWebScheme("dana")).toBe("dana");
    expect(withWebScheme("")).toBe("");
  });
});

describe("publicWebUrlSchema", () => {
  it("accepts a scheme-less profile and normalizes it", () => {
    const parsed = publicWebUrlSchema.safeParse("github.com/dana");
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data).toBe("https://github.com/dana");
  });

  it("rejects a non-URL without throwing", () => {
    // Zod v4 runs refinements after a failed base check, so a predicate that
    // calls `new URL` on unvalidated input throws straight out of safeParse.
    for (const value of ["", "not a url at all", "http://", "://nope"]) {
      const parsed = publicWebUrlSchema.safeParse(value);
      expect(parsed.success).toBe(false);
    }
  });

  it("still rejects non-web schemes", () => {
    expect(
      publicWebUrlSchema.safeParse("ftp://files.example.com").success,
    ).toBe(false);
    expect(publicWebUrlSchema.safeParse("javascript:alert(1)").success).toBe(
      false,
    );
    expect(
      publicWebUrlSchema.safeParse("mailto:dana@example.com").success,
    ).toBe(false);
  });

  it("accepts http and https unchanged", () => {
    const https = publicWebUrlSchema.safeParse("https://github.com/dana");
    expect(https.success && https.data).toBe("https://github.com/dana");
    expect(publicWebUrlSchema.safeParse("http://example.com").success).toBe(
      true,
    );
  });
});

describe("candidateContactSchema", () => {
  it("keeps the scheme-less links a resume header lists", () => {
    const parsed = candidateContactSchema.safeParse({
      email: "dana@example.com",
      githubUrl: "github.com/dana",
      linkedinUrl: "linkedin.com/in/dana",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.githubUrl).toBe(
      "https://github.com/dana",
    );
    expect(parsed.success && parsed.data.linkedinUrl).toBe(
      "https://linkedin.com/in/dana",
    );
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
