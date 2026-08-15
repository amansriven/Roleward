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
