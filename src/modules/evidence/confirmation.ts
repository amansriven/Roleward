import { evidenceItemSchema, type EvidenceItem } from "./schema";

/** Statuses that mean the candidate has actually looked at something. */
function decided(status: EvidenceItem["verificationStatus"]) {
  return status === "confirmed" || status === "corrected";
}

/**
 * Whether an entry carries evidence held at the entry level rather than in a
 * claim: structured education, project links, or a description that is the
 * whole entry. These share one `verificationStatus`, so they are confirmed
 * together.
 */
export function hasItemLevelEvidence(item: EvidenceItem) {
  return Boolean(
    (item.type === "education" && item.education) ||
    item.links.length > 0 ||
    item.summary,
  );
}

/** Decisions this entry is still waiting on. */
export function pendingDecisionCount(item: EvidenceItem) {
  const claims = item.claims.filter(
    (claim) => claim.verificationStatus === "proposed",
  ).length;
  const entry =
    hasItemLevelEvidence(item) && item.verificationStatus === "proposed"
      ? 1
      : 0;
  return claims + entry;
}

/**
 * Confirms what the candidate has not ruled on, and only that.
 *
 * The bulk actions on the review screen exist because most of a resume is
 * simply correct and clicking through it one line at a time is a tax. They are
 * still a confirmation, not a bypass — so a claim already rejected or
 * corrected keeps that decision. Approving in bulk may never silently undo a
 * deliberate answer.
 */
export function confirmPendingItem(item: EvidenceItem): EvidenceItem {
  return {
    ...item,
    verificationStatus: decided(item.verificationStatus)
      ? item.verificationStatus
      : "confirmed",
    claims: item.claims.map((claim) =>
      claim.verificationStatus === "proposed"
        ? { ...claim, verificationStatus: "confirmed" as const }
        : claim,
    ),
  };
}

export function confirmPendingEvidence(items: EvidenceItem[]): EvidenceItem[] {
  return items.map(confirmPendingItem);
}

export function finalizeConfirmedEvidence(items: EvidenceItem[]) {
  return items.flatMap((item) => {
    const claims = item.claims.filter((claim) =>
      decided(claim.verificationStatus),
    );
    const entryConfirmed = decided(item.verificationStatus);
    const structuredEducationConfirmed =
      item.type === "education" && Boolean(item.education) && entryConfirmed;
    const linksConfirmed = item.links.length > 0 && entryConfirmed;
    // A project written as a sentence rather than as bullets has nothing but
    // its description, and dropping it here undid the work of keeping it
    // through extraction: the entry survived review and then vanished on save.
    const summaryConfirmed = Boolean(item.summary) && entryConfirmed;
    if (
      claims.length === 0 &&
      !structuredEducationConfirmed &&
      !linksConfirmed &&
      !summaryConfirmed
    )
      return [];
    return [
      evidenceItemSchema.parse({
        ...item,
        links: linksConfirmed ? item.links : [],
        summary: summaryConfirmed ? item.summary : "",
        verificationStatus: "confirmed",
        claims,
      }),
    ];
  });
}
