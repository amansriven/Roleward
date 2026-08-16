import type { ResumeExtraction } from "./intake";

export function createSampleExtraction(resumeId: string): ResumeExtraction {
  return {
    resumeId,
    parserVersion: "local-demo-v1",
    items: [
      {
        id: crypto.randomUUID(),
        type: "project",
        title: "Campus Cart",
        organization: "Independent project",
        summary: "Campus marketplace built with Node.js and PostgreSQL.",
        verificationStatus: "proposed",
        claims: [
          {
            id: crypto.randomUUID(),
            type: "action",
            content:
              "Built 12 backend API endpoints using Node.js and PostgreSQL.",
            verificationStatus: "proposed",
          },
          {
            id: crypto.randomUUID(),
            type: "metric",
            content: "Reduced median API response time by 38%.",
            verificationStatus: "proposed",
          },
          {
            id: crypto.randomUUID(),
            type: "outcome",
            content: "Supported more than 800 student users.",
            verificationStatus: "proposed",
          },
        ],
      },
      {
        id: crypto.randomUUID(),
        type: "leadership",
        title: "CodePath Team Project",
        organization: "CodePath",
        summary: "Collaborated on a full-stack student project.",
        verificationStatus: "proposed",
        claims: [
          {
            id: crypto.randomUUID(),
            type: "responsibility",
            content: "Coordinated work across a five-person engineering team.",
            verificationStatus: "proposed",
          },
          {
            id: crypto.randomUUID(),
            type: "technology",
            content: "Used TypeScript, React, and GitHub Actions.",
            verificationStatus: "proposed",
          },
        ],
      },
    ],
  };
}
