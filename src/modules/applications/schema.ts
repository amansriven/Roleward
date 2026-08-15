import { z } from "zod";

export const applicationStatusSchema = z.enum([
  "saved",
  "preparing",
  "applied",
  "assessment",
  "interviewing",
  "offer",
  "closed",
]);

export const jobRequirementSchema = z.object({
  id: z.string().min(1),
  category: z.enum(["skill", "responsibility", "qualification", "competency"]),
  importance: z.enum(["required", "preferred", "inferred"]),
  content: z.string().trim().min(1),
  confirmed: z.boolean(),
  matchStrength: z.enum(["none", "weak", "strong"]),
  supportingClaimIds: z.array(z.string()),
});

export type JobRequirement = z.infer<typeof jobRequirementSchema>;
