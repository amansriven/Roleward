import { describe, expect, it } from "vitest";
import { finalizeConfirmedEvidence } from "./confirmation";
import type { EvidenceItem } from "./schema";

function education(status: EvidenceItem["verificationStatus"]): EvidenceItem {
  return {
    id: "education",
    type: "education",
    title: "Bachelor of Science",
    organization: "Texas A&M University",
    period: "Expected May 2027",
    summary: "",
    verificationStatus: status,
    education: {
      degree: "Bachelor of Science",
      fieldOfStudy: "Computer Science",
      gpa: "3.84/4.00",
      coursework: ["Software Engineering"],
      honors: [],
    },
    claims: [],
  };
}

describe("finalizeConfirmedEvidence", () => {
  it("keeps confirmed structured education even when it has no bullet claims", () => {
    expect(finalizeConfirmedEvidence([education("confirmed")])).toEqual([
      education("confirmed"),
    ]);
  });

  it("does not save structured education before the candidate confirms it", () => {
    expect(finalizeConfirmedEvidence([education("proposed")])).toEqual([]);
  });
});
