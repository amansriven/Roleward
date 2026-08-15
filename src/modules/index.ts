export const domainModules = [
  "identity",
  "candidates",
  "evidence",
  "applications",
  "resume-kitchen",
  "guru",
  "stage-fright",
  "readiness",
  "planning",
  "billing",
] as const;

export type DomainModule = (typeof domainModules)[number];

export * from "./applications/schema";
export * from "./candidates/schema";
export * from "./evidence/schema";
export * from "./readiness/model";
