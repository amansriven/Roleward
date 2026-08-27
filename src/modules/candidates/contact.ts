import { z } from "zod";

/**
 * An http(s) URL.
 *
 * The predicate has to be total. Zod v4 runs a refinement even when the check
 * before it has already failed, so this receives strings `new URL` throws on —
 * and "github.com/dana", written without a scheme, is how most people put their
 * profile on a resume. An exception raised here escapes `safeParse` itself,
 * which every caller reasonably assumes cannot throw: it took down resume
 * intake with a raw TypeError, and would have taken the workspace with it.
 */
export const publicWebUrlSchema = z.url().refine((value) => {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
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
