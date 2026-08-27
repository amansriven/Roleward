import { z } from "zod";
import {
  claimContentFromQuote,
  dominantClaimType,
  type DraftItem,
} from "./grounding";

/**
 * Recovering as much of a resume as the extractor actually read.
 *
 * The whole document used to be parsed in one `z.parse`, which meant a single
 * unusable entry rejected everything: a project the model gave no title, a
 * link it wrote without a scheme, a claim it left blank. The candidate saw
 * "the extractor returned something unusable" and could not use the product at
 * all, with nothing wrong with their resume.
 *
 * Entries, links, and claims are now salvaged one at a time. What cannot be
 * read is dropped and counted alongside the ungrounded claims, so the intake
 * screen can still say something was withheld and why.
 *
 * Free of `server-only`, so the recovery rules are testable without a model.
 */

const draftLinkSchema = z.object({
  label: z.string().trim().min(1),
  url: z.url(),
});

/**
 * A claim is just its quote on the wire.
 *
 * `content` and `type` used to be asked for as well. Content was specified as
 * the quote minus its bullet glyph and came back identical on every measured
 * run, and nothing in the product reads `type`. Deriving both here cut the
 * extractor's output by a third and its wall time with it.
 */
const draftClaimSchema = z
  .object({ sourceQuote: z.string().trim().min(1) })
  .transform((claim) => {
    const content = claimContentFromQuote(claim.sourceQuote);
    return {
      type: dominantClaimType(content),
      content,
      sourceQuote: claim.sourceQuote,
    };
  })
  // A quote that is nothing but a bullet glyph leaves no content behind.
  .refine((claim) => claim.content.length > 0);

const draftItemSchema = z.object({
  type: z.enum(["experience", "project", "education", "activity", "other"]),
  // Deliberately not `.min(1)`. Strict JSON schemas require every property to
  // be present, so the model is told throughout to return an empty string for
  // anything the resume does not say — and it applies that to `title` too, on
  // entries where the heading is not obviously a role or a project name. That
  // is recoverable, and it is not worth a failed upload.
  title: z.string().trim(),
  organization: z.string().trim().optional(),
  period: z.string().trim().optional(),
  location: z.string().trim().optional(),
  // Unknown, then salvaged one at a time: a single malformed link should cost
  // that link, not the entry it was attached to.
  links: z.array(z.unknown()),
  // Nullable: emitting six empty strings on every non-education entry was a
  // fifth of the extractor's output for entries that have no education fields.
  education: z
    .object({
      degree: z.string().trim(),
      fieldOfStudy: z.string().trim(),
      minor: z.string().trim(),
      gpa: z.string().trim(),
      coursework: z.array(z.string().trim()),
      honors: z.array(z.string().trim()),
    })
    .nullable(),
  summary: z.string().trim(),
  claims: z.array(z.unknown()),
});

/** Keeps the entries of an array that parse, discarding the ones that do not. */
function salvage<T>(schema: z.ZodType<T>, entries: unknown[]): T[] {
  return entries.flatMap((entry) => {
    const parsed = schema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
}

/**
 * A label for an entry the model gave no title.
 *
 * Usually education written as a school and a date with the degree implied, or
 * a project whose name sits in a heading the model did not read as the title.
 * The school, employer, or degree is a better answer than losing the entry —
 * and the candidate is about to be shown all of this to confirm anyway.
 */
function resolveTitle(item: z.infer<typeof draftItemSchema>) {
  if (item.title) return { title: item.title, promoted: false };
  if (item.type === "education" && item.education) {
    const degree = [item.education.degree, item.education.fieldOfStudy]
      .filter(Boolean)
      .join(", ");
    if (degree) return { title: degree, promoted: false };
  }
  const organization = item.organization?.trim() ?? "";
  return { title: organization, promoted: Boolean(organization) };
}

export interface DroppedEntry {
  content: string;
  sourceQuote: string;
  reason: string;
}

export interface SalvagedItems {
  items: DraftItem[];
  /** Entries we could not read, shaped like a dropped claim so they merge. */
  unusable: DroppedEntry[];
}

/**
 * Reads every entry the model returned, keeping the ones that survive.
 *
 * `entries` is deliberately `unknown[]`: it is model output, and the point of
 * this function is that no single bad element can take the rest with it.
 */
export function salvageItems(entries: unknown[]): SalvagedItems {
  const items: DraftItem[] = [];
  const unusable: DroppedEntry[] = [];

  for (const raw of entries) {
    const entry = draftItemSchema.safeParse(raw);
    if (!entry.success) {
      unusable.push({
        content: "An entry we could not read",
        sourceQuote: "",
        reason: `entry_unparseable:${
          entry.error.issues[0]?.path.join(".") ?? "unknown"
        }`,
      });
      continue;
    }

    const item = entry.data;
    const { title, promoted } = resolveTitle(item);
    if (!title) {
      unusable.push({
        content: "An entry with no title, employer, or school",
        sourceQuote: "",
        reason: "entry_untitled",
      });
      continue;
    }

    // A promoted organization is now the title; repeating it as the employer
    // renders "Acme - Acme" on the confirmation screen.
    const organization = promoted ? "" : (item.organization?.trim() ?? "");
    items.push({
      type: item.type,
      title,
      organization: organization || undefined,
      period: item.period?.trim() ? item.period : undefined,
      location: item.location?.trim() ? item.location : undefined,
      links: salvage(draftLinkSchema, item.links),
      summary: item.summary,
      claims: salvage(draftClaimSchema, item.claims),
      education:
        item.type === "education" && item.education
          ? {
              degree: item.education.degree || undefined,
              fieldOfStudy: item.education.fieldOfStudy || undefined,
              minor: item.education.minor || undefined,
              gpa: item.education.gpa || undefined,
              coursework: item.education.coursework,
              honors: item.education.honors,
            }
          : undefined,
    });
  }

  return { items, unusable };
}
