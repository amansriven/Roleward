import { describe, expect, it } from "vitest";
import {
  confirmPendingEvidence,
  confirmPendingItem,
  finalizeConfirmedEvidence,
  hasItemLevelEvidence,
  pendingDecisionCount,
} from "./confirmation";
import type { EvidenceItem } from "./schema";

function item(patch: Partial<EvidenceItem> = {}): EvidenceItem {
  return {
    id: "item-1",
    type: "experience",
    title: "Backend Intern",
    organization: "Acme",
    links: [],
    summary: "",
    verificationStatus: "proposed",
    claims: [
      {
        id: "c1",
        type: "action",
        content: "Built an ingestion service",
        verificationStatus: "proposed",
      },
      {
        id: "c2",
        type: "action",
        content: "Wrote the integration tests",
        verificationStatus: "proposed",
      },
    ],
    ...patch,
  };
}

describe("pendingDecisionCount", () => {
  it("counts undecided claims", () => {
    expect(pendingDecisionCount(item())).toBe(2);
  });

  it("adds one for entry-level evidence awaiting a decision", () => {
    const project = item({
      type: "project",
      summary: "A source-level profiler for Rust",
      claims: [],
    });
    expect(pendingDecisionCount(project)).toBe(1);
    expect(
      pendingDecisionCount({ ...project, verificationStatus: "confirmed" }),
    ).toBe(0);
  });

  it("ignores an entry status when there is nothing entry-level to review", () => {
    // An experience with only bullets has no education, links, or summary.
    expect(pendingDecisionCount(item({ claims: [] }))).toBe(0);
    expect(hasItemLevelEvidence(item())).toBe(false);
  });
});

describe("confirmPendingItem", () => {
  it("confirms everything still awaiting an answer", () => {
    const confirmed = confirmPendingItem(item());
    expect(confirmed.claims.map((c) => c.verificationStatus)).toEqual([
      "confirmed",
      "confirmed",
    ]);
    expect(confirmed.verificationStatus).toBe("confirmed");
  });

  it("never overrules a decision the candidate already made", () => {
    const reviewed = item({
      verificationStatus: "corrected",
      claims: [
        {
          id: "c1",
          type: "action",
          content: "Built an ingestion service",
          verificationStatus: "rejected",
        },
        {
          id: "c2",
          type: "action",
          content: "Rewrote the integration tests",
          verificationStatus: "corrected",
        },
        {
          id: "c3",
          type: "action",
          content: "Shipped the reconciliation report",
          verificationStatus: "proposed",
        },
      ],
    });
    const confirmed = confirmPendingItem(reviewed);
    expect(confirmed.claims.map((c) => c.verificationStatus)).toEqual([
      "rejected",
      "corrected",
      "confirmed",
    ]);
    // A corrected entry stays corrected rather than being flattened.
    expect(confirmed.verificationStatus).toBe("corrected");
  });

  it("leaves edited wording untouched", () => {
    const edited = item({
      claims: [
        {
          id: "c1",
          type: "action",
          content: "Wording the candidate fixed themselves",
          verificationStatus: "corrected",
        },
      ],
    });
    expect(confirmPendingItem(edited).claims[0]!.content).toBe(
      "Wording the candidate fixed themselves",
    );
  });
});

describe("confirmPendingEvidence", () => {
  it("leaves nothing pending across the whole resume", () => {
    const items = [item(), item({ id: "item-2" })];
    const confirmed = confirmPendingEvidence(items);
    expect(
      confirmed.reduce((n, entry) => n + pendingDecisionCount(entry), 0),
    ).toBe(0);
    // The originals are untouched, so React sees new objects.
    expect(items[0]!.claims[0]!.verificationStatus).toBe("proposed");
  });
});

describe("finalizeConfirmedEvidence", () => {
  it("keeps a project whose only confirmed evidence is its description", () => {
    const project = item({
      type: "project",
      title: "Tracelight",
      organization: undefined,
      summary: "A source-level profiler for Rust",
      claims: [],
      verificationStatus: "confirmed",
    });
    const [saved] = finalizeConfirmedEvidence([project]);
    expect(saved?.title).toBe("Tracelight");
    expect(saved?.summary).toBe("A source-level profiler for Rust");
  });

  it("drops a description the candidate never confirmed", () => {
    const project = item({
      type: "project",
      summary: "A source-level profiler for Rust",
      claims: [],
      verificationStatus: "proposed",
    });
    expect(finalizeConfirmedEvidence([project])).toHaveLength(0);
  });

  it("blanks an unconfirmed description on an entry kept for its claims", () => {
    const entry = item({
      summary: "A description nobody confirmed",
      verificationStatus: "proposed",
      claims: [
        {
          id: "c1",
          type: "action",
          content: "Built an ingestion service",
          verificationStatus: "confirmed",
        },
      ],
    });
    const [saved] = finalizeConfirmedEvidence([entry]);
    expect(saved?.claims).toHaveLength(1);
    expect(saved?.summary).toBe("");
  });

  it("keeps only confirmed and corrected claims", () => {
    const entry = item({
      claims: [
        {
          id: "c1",
          type: "action",
          content: "Kept",
          verificationStatus: "confirmed",
        },
        {
          id: "c2",
          type: "action",
          content: "Fixed",
          verificationStatus: "corrected",
        },
        {
          id: "c3",
          type: "action",
          content: "Denied",
          verificationStatus: "rejected",
        },
        {
          id: "c4",
          type: "action",
          content: "Ignored",
          verificationStatus: "proposed",
        },
      ],
    });
    expect(
      finalizeConfirmedEvidence([entry])[0]!.claims.map((c) => c.content),
    ).toEqual(["Kept", "Fixed"]);
  });

  it("saves everything once the candidate has confirmed in bulk", () => {
    const project = item({
      id: "item-2",
      type: "project",
      title: "Tracelight",
      organization: undefined,
      summary: "A source-level profiler for Rust",
      claims: [],
    });
    const saved = finalizeConfirmedEvidence(
      confirmPendingEvidence([item(), project]),
    );
    expect(saved).toHaveLength(2);
    expect(saved[0]!.claims).toHaveLength(2);
    expect(saved[1]!.summary).toBe("A source-level profiler for Rust");
  });
});
