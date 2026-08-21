import { z } from "zod";
import {
  candidateContactSchema,
  resumeLinkSchema,
} from "@/modules/candidates/contact";
import { educationDetailsSchema } from "@/modules/evidence/schema";

/**
 * A published portfolio.
 *
 * Stored as a snapshot taken at publish time rather than read live from the
 * workspace. The workspace lives in the browser and syncs, so a live read would
 * publish half-finished edits; and unpublishing has to actually take the page
 * down, which only works if publishing was a deliberate copy.
 */
export const portfolioClaimSchema = z.object({
  content: z.string().trim().min(1),
});

export const portfolioItemSchema = z.object({
  type: z.enum([
    "experience",
    "project",
    "education",
    "activity",
    "leadership",
    "other",
  ]),
  title: z.string().trim().min(1),
  organization: z.string().trim().optional(),
  period: z.string().trim().optional(),
  location: z.string().trim().optional(),
  links: z.array(resumeLinkSchema).default([]),
  education: educationDetailsSchema.optional(),
  summary: z.string().trim().default(""),
  claims: z.array(portfolioClaimSchema),
});

export const portfolioSkillGroupSchema = z.object({
  category: z.string().trim().max(120),
  skills: z.array(z.string().trim().min(1).max(120)).max(60),
});

export const portfolioSchema = z.object({
  handle: z.string().min(3),
  userId: z.string().min(1),
  name: z.string().trim().min(1),
  headline: z.string().trim(),
  contact: candidateContactSchema.nullable().default(null),
  // Default keeps portfolio snapshots published before skills were included readable.
  skills: z.array(portfolioSkillGroupSchema).max(20).default([]),
  items: z.array(portfolioItemSchema),
  /** False takes the page down without deleting the handle they were given. */
  published: z.boolean(),
  publishedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Portfolio = z.infer<typeof portfolioSchema>;
export type PortfolioItem = z.infer<typeof portfolioItemSchema>;
