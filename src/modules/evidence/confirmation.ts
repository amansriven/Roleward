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
    const linksConfirmed =
      item.links.length > 0 &&
      (item.verificationStatus === "confirmed" ||
        item.verificationStatus === "corrected");
    if (claims.length === 0 && !structuredEducationConfirmed && !linksConfirmed)
      return [];
    return [
      evidenceItemSchema.parse({
        ...item,
        links: linksConfirmed ? item.links : [],
        verificationStatus: "confirmed",
        claims,
      }),
    ];
  });
}
