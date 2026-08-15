import { z } from "zod";

export const verificationStatusSchema = z.enum([
  "proposed",
  "confirmed",
  "corrected",
  "rejected",
]);

export const evidenceClaimSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["action", "outcome", "metric", "technology", "responsibility"]),
  content: z.string().trim().min(1),
  verificationStatus: verificationStatusSchema,
});

export const evidenceItemSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["experience", "project", "education", "leadership", "other"]),
  title: z.string().trim().min(1),
  organization: z.string().trim().optional(),
  summary: z.string().trim().min(1),
  verificationStatus: verificationStatusSchema,
  claims: z.array(evidenceClaimSchema),
});

export type EvidenceItem = z.infer<typeof evidenceItemSchema>;
