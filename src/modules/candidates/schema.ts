import { z } from "zod";

export const candidateTrackSchema = z.enum(["internship", "new_grad"]);

export const candidateProfileSchema = z.object({
  track: candidateTrackSchema,
  graduationDate: z.string().date(),
  weeklyMinutes: z.number().int().min(30).max(2400),
  preferredLanguages: z.array(z.enum(["typescript", "python", "java"])).min(1),
  targetRoleTypes: z.array(z.string().trim().min(1)).min(1).max(5),
  interviewTimeline: z.enum([
    "exploring",
    "one_month",
    "three_months",
    "six_months",
  ]),
});

export type CandidateProfile = z.infer<typeof candidateProfileSchema>;
