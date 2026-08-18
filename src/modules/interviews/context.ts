import type { CandidateProfile } from "@/modules/candidates/schema";
import type { EvidenceItem } from "@/modules/evidence/schema";
import type { StoredApplication } from "@/modules/workspace/repository";
import { INTENSITY_DIRECTION, INTERVIEW_PLANS, TURN_BUDGETS } from "./plan";
import { describeRuns } from "./coding/from-pool";
import {
  COMPETENCY_LABELS,
  type CodingRun,
  type InterviewConfig,
  type RoleTarget,
  type StoredCodingProblem,
} from "./schema";

/** Reads back the signature the way an interviewer would say it. */
function signatureLine(signature: {
  name: string;
  parameters: { name: string; type: string }[];
  returnType: string;
}) {
  const parameters = signature.parameters
    .map((item) => `${item.name}: ${item.type}`)
    .join(", ");
  return `${signature.name}(${parameters}) returning ${signature.returnType}`;
}

export interface ResolvedRole {
  label: string;
  description: string;
}

/**
 * A role target the candidate can always produce, even with an empty workspace.
 * `url` arrives already resolved because fetching happens server-side.
 */
export function resolveRoleTarget(
  target: RoleTarget,
  applications: StoredApplication[],
): ResolvedRole | null {
  switch (target.kind) {
    case "application": {
      const application = applications.find(
        (item) => item.id === target.applicationId,
      );
      if (!application) return null;
      return {
        label: `${application.companyName} · ${application.roleTitle}`,
        description: application.jobDescription,
      };
    }
    case "pasted":
      return {
        label: "Pasted job description",
        description: target.jobDescription,
      };
    case "url":
      return { label: target.url, description: target.resolvedDescription };
    case "generic":
      return { label: target.label, description: "" };
  }
}

function describeEvidence(evidence: EvidenceItem[]) {
  const confirmed = evidence
    .map((item) => ({
      ...item,
      claims: item.claims.filter(
        (claim) =>
          claim.verificationStatus === "confirmed" ||
          claim.verificationStatus === "corrected",
      ),
    }))
    .filter((item) => item.claims.length > 0);
  if (!confirmed.length) return "";
  return confirmed
    .map((item) => {
      const heading = [item.title, item.organization]
        .filter(Boolean)
        .join(" — ");
      const claims = item.claims.map((claim) => `  - ${claim.content}`);
      return [`- ${heading}: ${item.summary}`, ...claims].join("\n");
    })
    .join("\n");
}

function describeProfile(profile: CandidateProfile | null) {
  if (!profile) return "";
  return [
    `Track: ${profile.track === "internship" ? "internship" : "new grad"}`,
    `Target roles: ${profile.targetRoleTypes.join(", ")}`,
    `Preferred languages: ${profile.preferredLanguages.join(", ")}`,
  ].join("\n");
}

export interface BuildContextInput {
  config: InterviewConfig;
  role: ResolvedRole;
  profile: CandidateProfile | null;
  evidence: EvidenceItem[];
  codingProblem?: StoredCodingProblem | null;
  codingRuns?: CodingRun[];
}

/**
 * The interviewer's system instructions. Used verbatim for text mode and as the
 * Realtime session `instructions` for voice, so both modalities behave alike.
 */
export function buildInterviewerInstructions({
  config,
  role,
  profile,
  evidence,
  codingProblem,
  codingRuns = [],
}: BuildContextInput) {
  const plan = INTERVIEW_PLANS[config.type];
  const sections: string[] = [
    `You are ${plan.persona}`,
    `You are interviewing a candidate for: ${role.label}.`,
    INTENSITY_DIRECTION[config.intensity],
    `Aim to cover about ${TURN_BUDGETS[config.length]} candidate answers, then close the interview.`,
  ];

  if (role.description)
    sections.push(`Job description:\n${role.description.slice(0, 4000)}`);

  const profileText = describeProfile(profile);
  if (profileText) sections.push(`Candidate profile:\n${profileText}`);

  const evidenceText = describeEvidence(evidence);
  if (evidenceText)
    sections.push(
      `The candidate's verified background. Ground your questions in this, and never invent experience they did not report:\n${evidenceText}`,
    );
  else
    sections.push(
      "The candidate has not added a résumé yet. Ask open questions about their background rather than assuming any specific experience.",
    );

  if (plan.tracksCompetencies)
    sections.push(
      `Behavioral competencies you may probe: ${Object.values(COMPETENCY_LABELS).join(", ")}.`,
    );

  if (config.type === "coding" && codingProblem) {
    const execution = codingProblem.execution;
    sections.push(
      [
        `The problem is "${codingProblem.title}" (${codingProblem.topic}, ${config.difficulty ?? "medium"}).`,
        `Prompt shown to the candidate: ${codingProblem.prompt}`,
        execution
          ? `They must implement ${signatureLine(execution.signature)}.`
          : "",
        execution
          ? `The intended solution is ${execution.expectedComplexity.time} time and ${execution.expectedComplexity.space} space. Do not state this; use it to judge whether their approach is the intended one.`
          : "",
        codingProblem.edgeCases.length
          ? `Edge cases to raise only if the candidate does not: ${codingProblem.edgeCases.join("; ")}.`
          : "",
        "Open by presenting the problem in your own words. The candidate writes code in an editor; you receive a summary of their edits, including code they wrote and deleted, only when they ask for a check-in. Never write the solution for them.",
      ]
        .filter(Boolean)
        .join("\n"),
    );

    // Correctness used to be guesswork read off an edit log. When the problem
    // came from the pool it is a fact, and saying so plainly matters more than
    // brevity: an interviewer who hedges about working code loses the candidate.
    if (execution)
      sections.push(
        [
          "Whether the candidate's code works is established by running it against the real tests, not inferred from how they typed.",
          describeRuns(codingRuns),
          "Only some tests are visible to them. Never reveal a hidden test's input or expected value, and never claim their code is correct unless a run says so.",
        ].join(" "),
      );
  }

  sections.push(
    "Speak only as the interviewer. Ask one question at a time and wait for the answer. Never grade the candidate mid-interview or reveal a score.",
  );

  return sections.join("\n\n");
}
