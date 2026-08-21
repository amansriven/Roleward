import { describe, expect, it } from "vitest";
import type { EvidenceItem } from "@/modules/evidence/schema";
import {
  createOriginalResumeVersion,
  forkResumeVersion,
  updateResumeVersion,
} from "./versions";

const evidence: EvidenceItem[] = [
  {
    id: "experience-1",
    type: "experience",
    title: "Engineer",
    links: [],
    summary: "Built developer tools.",
    verificationStatus: "confirmed",
    claims: [
      {
        id: "claim-1",
        type: "outcome",
        content: "Reduced deploy time by 35%.",
        verificationStatus: "confirmed",
      },
      {
        id: "claim-2",
        type: "technology",
        content: "Used TypeScript.",
        verificationStatus: "proposed",
      },
    ],
  },
];

const now = "2026-08-21T00:00:00.000Z";

describe("resume versions", () => {
  it("captures only confirmed evidence in the immutable original", () => {
    const original = createOriginalResumeVersion({
      id: "original-1",
      name: "Campus resume — Original",
      evidence,
      now,
    });

    expect(original.kind).toBe("original");
    expect(original.items[0]?.bullets).toEqual([
      {
        id: "claim-1",
        content: "Reduced deploy time by 35%.",
        sourceClaimIds: ["claim-1"],
      },
    ]);
  });

  it("forks a separately named editable revision", () => {
    const original = createOriginalResumeVersion({
      id: "original-1",
      name: "Original",
      evidence,
      now,
    });
    const revision = forkResumeVersion({
      source: original,
      id: "revision-1",
      name: "Acme backend role",
      applicationId: "app-1",
      now,
    });

    expect(revision).toMatchObject({
      id: "revision-1",
      name: "Acme backend role",
      kind: "revision",
      sourceVersionId: "original-1",
      applicationId: "app-1",
    });
    expect(revision.items).toEqual(original.items);
  });

  it("protects original content while allowing it to be renamed", () => {
    const original = createOriginalResumeVersion({
      id: "original-1",
      name: "Original",
      evidence,
      now,
    });

    expect(() => updateResumeVersion(original, { items: [] }, now)).toThrow(
      "cannot be changed",
    );
    expect(
      updateResumeVersion(original, { name: "Master original" }, now).name,
    ).toBe("Master original");
  });
});
