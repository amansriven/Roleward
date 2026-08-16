import { z } from "zod";
import type { EvidenceItem } from "@/modules/evidence/schema";
import { jobRequirementSchema, type JobRequirement } from "./schema";

export const targetApplicationSchema = z.object({
  id: z.string().min(1),
  companyName: z.string().trim().min(1),
  roleTitle: z.string().trim().min(1),
  location: z.string().trim().optional(),
  sourceUrl: z.union([z.literal(""), z.url()]),
  deadline: z.string().optional(),
  status: z.literal("preparing"),
  jobDescription: z.string().trim().min(80),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  createdAt: z.string().datetime(),
});
export type TargetApplication = z.infer<typeof targetApplicationSchema>;

const rules = [
  {
    terms: ["node", "api", "backend", "service"],
    content: "Build scalable backend services and APIs",
    category: "responsibility" as const,
  },
  {
    terms: ["data structure", "algorithm", "problem solving"],
    content: "Strong data structures and algorithms fundamentals",
    category: "skill" as const,
  },
  {
    terms: ["sql", "postgres", "database"],
    content: "Experience with relational databases and SQL",
    category: "skill" as const,
  },
  {
    terms: ["collaborat", "cross-functional", "team"],
    content: "Collaborate effectively with engineering partners",
    category: "competency" as const,
  },
  {
    terms: ["distributed", "scalable", "reliable"],
    content: "Understand scalable and reliable system design",
    category: "skill" as const,
  },
  {
    terms: ["typescript", "javascript", "react"],
    content: "Production experience with TypeScript or JavaScript",
    category: "skill" as const,
  },
] as const;

export function extractRequirements(text: string): JobRequirement[] {
  const normalized = text.toLowerCase();
  const matches = rules.filter((rule) =>
    rule.terms.some((term) => normalized.includes(term)),
  );
  const selected = matches.length >= 3 ? matches : rules.slice(0, 5);
  return selected.map((rule, index) =>
    jobRequirementSchema.parse({
      id: `requirement-${index + 1}`,
      category: rule.category,
      importance: index < 3 ? "required" : "preferred",
      content: rule.content,
      confirmed: false,
      matchStrength: "none",
      supportingClaimIds: [],
    }),
  );
}

const stopWords = new Set([
  "with",
  "and",
  "the",
  "for",
  "using",
  "strong",
  "build",
  "experience",
  "effectively",
  "production",
]);
function terms(value: string) {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9+#. ]/g, " ")
      .split(/\s+/)
      .filter((term) => term.length > 2 && !stopWords.has(term)),
  );
}

export function matchRequirements(
  requirements: JobRequirement[],
  evidence: EvidenceItem[],
) {
  const confirmedClaims = evidence.flatMap((item) =>
    item.claims
      .filter(
        (claim) =>
          claim.verificationStatus === "confirmed" ||
          claim.verificationStatus === "corrected",
      )
      .map((claim) => ({ item, claim })),
  );
  return requirements.map((requirement) => {
    const requirementTerms = terms(requirement.content);
    const ranked = confirmedClaims
      .map((entry) => ({
        ...entry,
        overlap: [
          ...terms(
            `${entry.item.title} ${entry.item.summary} ${entry.claim.content}`,
          ),
        ].filter((term) => requirementTerms.has(term)).length,
      }))
      .filter((entry) => entry.overlap > 0)
      .sort((a, b) => b.overlap - a.overlap);
    const best = ranked[0];
    return jobRequirementSchema.parse({
      ...requirement,
      matchStrength: !best ? "none" : best.overlap >= 2 ? "strong" : "weak",
      supportingClaimIds: best ? [best.claim.id] : [],
    });
  });
}

export async function hashDescription(text: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text.trim()),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
