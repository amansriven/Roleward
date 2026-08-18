import { describe, expect, it } from "vitest";
import { buildInterviewerInstructions } from "./context";
import type { EvidenceItem } from "@/modules/evidence/schema";
import type { InterviewConfig } from "./schema";

const config = {
  type: "behavioral",
  modality: "text",
  intensity: "realistic",
  length: "quick",
  roleTarget: { kind: "generic", label: "Software engineer" },
} as InterviewConfig;

const base = {
  config,
  role: { label: "Software engineer", description: "" },
  profile: null,
};

const item = (status: EvidenceItem["claims"][number]["verificationStatus"]) =>
  ({
    id: "item-1",
    type: "project",
    title: "Campus Cart",
    organization: "Independent",
    summary: "A campus marketplace.",
    verificationStatus: "proposed",
    claims: [
      {
        id: "claim-1",
        type: "action",
        content: "Built a marketplace backend with Node.js",
        verificationStatus: status,
      },
    ],
  }) as EvidenceItem;

describe("résumé context", () => {
  it("gives the interviewer confirmed experience to ground questions in", () => {
    const text = buildInterviewerInstructions({
      ...base,
      evidence: [item("confirmed")],
    });
    expect(text).toContain("Campus Cart");
    expect(text).toContain("[Project]");
  });

  it("marks a claim the candidate rewrote themselves", () => {
    const text = buildInterviewerInstructions({
      ...base,
      evidence: [item("corrected")],
    });
    expect(text).toContain("the candidate rewrote this themselves");
  });

  it("does not pass on a claim the candidate never confirmed", () => {
    const text = buildInterviewerInstructions({
      ...base,
      evidence: [item("proposed")],
    });
    expect(text).not.toContain("Campus Cart");
  });

  it("distinguishes an unconfirmed résumé from no résumé at all", () => {
    // Saying "no résumé" when one was uploaded opens the wrong interview.
    const uploaded = buildInterviewerInstructions({
      ...base,
      evidence: [item("proposed")],
    });
    expect(uploaded).toContain("uploaded a résumé but has not confirmed");

    const none = buildInterviewerInstructions({ ...base, evidence: [] });
    expect(none).toContain("has not added a résumé yet");
  });
});
