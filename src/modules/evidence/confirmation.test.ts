import { describe, expect, it } from "vitest";
import { finalizeConfirmedEvidence } from "./confirmation";
import type { EvidenceItem } from "./schema";

function education(status: EvidenceItem["verificationStatus"]): EvidenceItem {
  return {
    id: "education",
    type: "education",
    title: "Bachelor of Science",
    links: [],
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
  it("keeps a confirmed project link even when the project has no bullets", () => {
    const project: EvidenceItem = {
      id: "project",
      type: "project",
      title: "Campus Cart",
      links: [{ label: "GitHub", url: "https://github.com/jane/campus-cart" }],
      summary: "",
      verificationStatus: "confirmed",
      claims: [],
    };

    expect(finalizeConfirmedEvidence([project])).toEqual([project]);
  });

  it("does not save a project link before the candidate confirms it", () => {
    const project: EvidenceItem = {
      id: "project",
      type: "project",
      title: "Campus Cart",
      links: [{ label: "GitHub", url: "https://github.com/jane/campus-cart" }],
      summary: "",
      verificationStatus: "proposed",
      claims: [],
    };

    expect(finalizeConfirmedEvidence([project])).toEqual([]);
  });

  it("keeps confirmed structured education even when it has no bullet claims", () => {
    expect(finalizeConfirmedEvidence([education("confirmed")])).toEqual([
      education("confirmed"),
    ]);
  });

  it("does not save structured education before the candidate confirms it", () => {
    expect(finalizeConfirmedEvidence([education("proposed")])).toEqual([]);
  });
});
