import { z } from "zod";

export const publicWebUrlSchema = z.url().refine((value) => {
  const protocol = new URL(value).protocol;
  return protocol === "http:" || protocol === "https:";
}, "Use an http or https URL");

export const resumeLinkSchema = z.object({
  label: z.string().trim().min(1).max(120),
  url: publicWebUrlSchema,
});

export const candidateContactSchema = z.object({
  email: z.email().optional(),
  phone: z.string().trim().min(5).max(40).optional(),
  location: z.string().trim().min(2).max(160).optional(),
  linkedinUrl: publicWebUrlSchema.optional(),
  githubUrl: publicWebUrlSchema.optional(),
  websiteUrl: publicWebUrlSchema.optional(),
});

export type ResumeLink = z.infer<typeof resumeLinkSchema>;
export type CandidateContact = z.infer<typeof candidateContactSchema>;

export function contactHasValues(contact?: CandidateContact | null) {
  return Boolean(contact && Object.values(contact).some(Boolean));
}
