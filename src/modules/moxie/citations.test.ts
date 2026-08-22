import { describe, expect, it } from "vitest";
import {
  collectMoxieCitations,
  resolveMoxieCitation,
  splitMoxieCitations,
} from "./citations";

describe("Moxie citations", () => {
  it("routes each source category to its workspace surface", () => {
    expect(resolveMoxieCitation("Active application").href).toBe(
      "/dashboard/applications",
    );
    expect(resolveMoxieCitation("Zed").href).toBe("/dashboard/zed");
    expect(resolveMoxieCitation("Stage Fright").href).toBe(
      "/dashboard/stage-fright",
    );
    expect(resolveMoxieCitation("Active resume").href).toBe(
      "/dashboard/resume-kitchen",
    );
  });

  it("deep-links evidence to the named section", () => {
    expect(resolveMoxieCitation("Evidence · Projects · Ledger").href).toBe(
      "/dashboard/evidence/projects",
    );
    expect(resolveMoxieCitation("Evidence · Ledger rewrite").href).toBe(
      "/dashboard/evidence",
    );
  });

  it("labels the chip with the detail when one is given", () => {
    expect(resolveMoxieCitation("Evidence · Ledger rewrite").label).toBe(
      "Ledger rewrite",
    );
    expect(resolveMoxieCitation("Zed").label).toBe("Zed");
  });

  it("falls back to the dashboard for unknown sources", () => {
    expect(resolveMoxieCitation("Something else").href).toBe("/dashboard");
  });

  it("splits text around each marker", () => {
    const segments = splitMoxieCitations(
      "You shipped it. [Source: Zed] Keep going.",
    );
    expect(segments.map((item) => item.type)).toEqual([
      "text",
      "citation",
      "text",
    ]);
    expect(segments[0]).toEqual({ type: "text", value: "You shipped it. " });
  });

  it("collects distinct sources in first-mention order", () => {
    const citations = collectMoxieCitations(
      "A [Source: Zed] B [Source: Stage Fright] C [Source: Zed]",
    );
    expect(citations.map((item) => item.label)).toEqual([
      "Zed",
      "Stage Fright",
    ]);
  });

  it("returns the original text when there are no markers", () => {
    expect(splitMoxieCitations("Plain answer")).toEqual([
      { type: "text", value: "Plain answer" },
    ]);
    expect(collectMoxieCitations("Plain answer")).toEqual([]);
  });
});
