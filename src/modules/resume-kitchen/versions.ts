import { z } from "zod";
import {
  educationDetailsSchema,
  evidenceItemTypeSchema,
  type EvidenceItem,
} from "@/modules/evidence/schema";
import {
  candidateContactSchema,
  resumeLinkSchema,
  type CandidateContact,
} from "@/modules/candidates/contact";

export const resumeVersionBulletSchema = z.object({
  id: z.string().min(1),
  content: z.string().trim().min(1).max(600),
  /** Confirmed evidence claims that support this wording. */
  sourceClaimIds: z.array(z.string().min(1)).min(1),
});

export const resumeVersionItemSchema = z.object({
  id: z.string().min(1),
  evidenceItemId: z.string().min(1),
  type: evidenceItemTypeSchema,
  title: z.string().trim().min(1).max(200),
  organization: z.string().trim().max(200).optional(),
  period: z.string().trim().max(120).optional(),
  location: z.string().trim().max(160).optional(),
  links: z.array(resumeLinkSchema).default([]),
  education: educationDetailsSchema.optional(),
  summary: z.string().trim().max(1000).default(""),
  bullets: z.array(resumeVersionBulletSchema),
});

export const resumeVersionSkillGroupSchema = z.object({
  category: z.string().trim().max(120),
  skills: z.array(z.string().trim().min(1).max(120)).max(60),
});

export const resumeVersionSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  kind: z.enum(["original", "revision"]),
  sourceVersionId: z.string().min(1).optional(),
  applicationId: z.string().min(1).optional(),
  headline: z.string().trim().max(200).default(""),
  contact: candidateContactSchema.nullable().default(null),
  skills: z.array(resumeVersionSkillGroupSchema).max(20).default([]),
  items: z.array(resumeVersionItemSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ResumeVersion = z.infer<typeof resumeVersionSchema>;

function confirmedClaims(item: EvidenceItem) {
  return item.claims.filter(
    (claim) =>
      claim.verificationStatus === "confirmed" ||
      claim.verificationStatus === "corrected",
  );
}

export function createOriginalResumeVersion({
  id,
  name,
  evidence,
  headline = "",
  skills = [],
  contact = null,
  now,
}: {
  id: string;
  name: string;
  evidence: EvidenceItem[];
  headline?: string;
  skills?: { category: string; skills: string[] }[];
  contact?: CandidateContact | null;
  now: string;
}): ResumeVersion {
  return resumeVersionSchema.parse({
    id,
    name,
    kind: "original",
    headline,
    contact,
    skills,
    items: evidence.flatMap((item) => {
      const claims = confirmedClaims(item);
      if (
        !claims.length &&
        item.type !== "education" &&
        item.links.length === 0
      )
        return [];
      return [
        {
          id: item.id,
          evidenceItemId: item.id,
          type: item.type,
          title: item.title,
          organization: item.organization,
          period: item.period,
          location: item.location,
          links: item.links,
          education: item.education,
          summary: item.summary,
          bullets: claims.map((claim) => ({
            id: claim.id,
            content: claim.content,
            sourceClaimIds: [claim.id],
          })),
        },
      ];
    }),
    createdAt: now,
    updatedAt: now,
  });
}

export function forkResumeVersion({
  source,
  id,
  name,
  applicationId,
  now,
}: {
  source: ResumeVersion;
  id: string;
  name: string;
  applicationId?: string;
  now: string;
}): ResumeVersion {
  return resumeVersionSchema.parse({
    ...source,
    id,
    name,
    kind: "revision",
    sourceVersionId: source.id,
    applicationId,
    createdAt: now,
    updatedAt: now,
  });
}

export function updateResumeVersion(
  version: ResumeVersion,
  patch: {
    name?: string;
    headline?: string;
    skills?: ResumeVersion["skills"];
    contact?: ResumeVersion["contact"];
    items?: ResumeVersion["items"];
  },
  now: string,
): ResumeVersion {
  if (
    version.kind === "original" &&
    (patch.items ||
      "headline" in patch ||
      "skills" in patch ||
      "contact" in patch)
  )
    throw new Error("Original resume content cannot be changed");
  return resumeVersionSchema.parse({
    ...version,
    ...patch,
    updatedAt: now,
  });
}

export function versionEvidence(version: ResumeVersion): EvidenceItem[] {
  return version.items.map((item) => ({
    id: item.evidenceItemId,
    type: item.type,
    title: item.title,
    organization: item.organization,
    period: item.period,
    location: item.location,
    links: item.links,
    education: item.education,
    summary: item.summary,
    verificationStatus: "confirmed",
    claims: item.bullets.map((bullet) => ({
      id: bullet.id,
      type: "action",
      content: bullet.content,
      verificationStatus: "corrected",
    })),
  }));
}
