import { z } from "zod";

/**
 * Supplies the scheme a resume leaves off.
 *
 * Almost nobody writes "https://github.com/dana" on a resume; they write
 * "github.com/dana". Parsed strictly, that is not a URL, so the link was
 * dropped and the contact block came back with no GitHub and no LinkedIn on a
 * resume that plainly listed both.
 *
 * Anything that already carries a scheme is returned untouched, so "ftp://"
 * and "javascript:" still fail the check below rather than being rewritten
 * into something that passes. A value has to look like a host — a dot before
 * any path, and no spaces — before a scheme is assumed for it.
 */
export function withWebScheme(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  if (!/^[^\s/:]+\.[^\s/:]+/.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/**
 * An http(s) URL, tolerant of a missing scheme.
 *
 * The predicate has to be total. Zod v4 runs a refinement even when the check
 * before it has already failed, so it receives strings `new URL` throws on. An
 * exception raised here escapes `safeParse` itself, which every caller
 * reasonably assumes cannot throw: it took down resume intake with a raw
 * TypeError, and would have taken the workspace with it.
 */
export const publicWebUrlSchema = z.preprocess(
  (value) => (typeof value === "string" ? withWebScheme(value) : value),
  z.url().refine((value) => {
    try {
      const protocol = new URL(value).protocol;
      return protocol === "http:" || protocol === "https:";
    } catch {
      return false;
    }
  }, "Use an http or https URL"),
);

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
