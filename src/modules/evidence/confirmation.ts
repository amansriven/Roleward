import { evidenceItemSchema, type EvidenceItem } from "./schema";

export function finalizeConfirmedEvidence(items: EvidenceItem[]) {
  return items.flatMap((item) => {
    const claims = item.claims.filter(
      (claim) =>
        claim.verificationStatus === "confirmed" ||
        claim.verificationStatus === "corrected",
    );
    const structuredEducationConfirmed =
      item.type === "education" &&
      Boolean(item.education) &&
      (item.verificationStatus === "confirmed" ||
        item.verificationStatus === "corrected");
    if (claims.length === 0 && !structuredEducationConfirmed) return [];
    return [
      evidenceItemSchema.parse({
        ...item,
        verificationStatus: "confirmed",
        claims,
      }),
    ];
  });
}
