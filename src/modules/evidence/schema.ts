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

export const evidenceItemTypeSchema = z.enum([
  "experience",
  "project",
  "education",
  "activity",
  // Kept readable for workspaces imported before extracurriculars received
  // their own section name.
  "leadership",
  "other",
]);

export const educationDetailsSchema = z.object({
  degree: z.string().trim().optional(),
  fieldOfStudy: z.string().trim().optional(),
  minor: z.string().trim().optional(),
  gpa: z.string().trim().optional(),
  coursework: z.array(z.string().trim().min(1)).default([]),
  honors: z.array(z.string().trim().min(1)).default([]),
});

export const evidenceItemSchema = z.object({
  id: z.string().min(1),
  type: evidenceItemTypeSchema,
  title: z.string().trim().min(1),
  organization: z.string().trim().optional(),
  period: z.string().trim().optional(),
  location: z.string().trim().optional(),
  education: educationDetailsSchema.optional(),
  summary: z.string().trim().default(""),
  verificationStatus: verificationStatusSchema,
  claims: z.array(evidenceClaimSchema),
});

export type EvidenceItem = z.infer<typeof evidenceItemSchema>;
