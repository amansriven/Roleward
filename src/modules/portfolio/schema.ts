import { z } from "zod";

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
  type: z.enum(["experience", "project", "education", "leadership", "other"]),
  title: z.string().trim().min(1),
  organization: z.string().trim().optional(),
  summary: z.string().trim().min(1),
  claims: z.array(portfolioClaimSchema),
});

export const portfolioSchema = z.object({
  handle: z.string().min(3),
  userId: z.string().min(1),
  name: z.string().trim().min(1),
  headline: z.string().trim(),
  items: z.array(portfolioItemSchema),
  /** False takes the page down without deleting the handle they were given. */
  published: z.boolean(),
  publishedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Portfolio = z.infer<typeof portfolioSchema>;
export type PortfolioItem = z.infer<typeof portfolioItemSchema>;
