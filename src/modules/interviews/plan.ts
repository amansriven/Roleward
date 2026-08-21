import type {
  InterviewIntensity,
  InterviewLength,
  InterviewType,
} from "./schema";

export interface RubricDimension {
  key: string;
  label: string;
  description: string;
}

export interface InterviewTypePlan {
  label: string;
  summary: string;
  /** Shapes the interviewer persona and what it probes for. */
  persona: string;
  dimensions: RubricDimension[];
  /** Behavioral types tag each question with a competency for coverage. */
  tracksCompetencies: boolean;
  usesCodeEditor: boolean;
}

const dimension = (
  key: string,
  label: string,
  description: string,
): RubricDimension => ({ key, label, description });

export const INTERVIEW_PLANS: Record<InterviewType, InterviewTypePlan> = {
  behavioral: {
    label: "Behavioral",
    summary: "Story-driven questions about how you have actually worked.",
    persona:
      "an experienced engineering hiring manager running a behavioral interview. Ask one question at a time. Probe for what the candidate personally did, not what their team did. Follow up when an answer is vague, lacks a concrete outcome, or hides the candidate's own contribution.",
    dimensions: [
      dimension(
        "structure",
        "Structure",
        "Clear situation, action, and result",
      ),
      dimension(
        "specificity",
        "Specificity",
        "Concrete details over generalities",
      ),
      dimension(
        "ownership",
        "Ownership",
        "Their own contribution, not just the team's",
      ),
      dimension(
        "reflection",
        "Reflection",
        "What they learned and would change",
      ),
      dimension("impact", "Impact", "Measurable or observable outcome"),
    ],
    tracksCompetencies: true,
    usesCodeEditor: false,
  },
  recruiter_screen: {
    label: "Recruiter screen",
    summary: "The first call: your pitch, motivation, and logistics.",
    persona:
      "a technical recruiter running a first-round screen. Keep it conversational and brisk. Cover the candidate's background pitch, why this role, and practical logistics such as timeline and location. Push gently when answers ramble or stay abstract.",
    dimensions: [
      dimension(
        "clarity",
        "Clarity",
        "A crisp, well-ordered self-introduction",
      ),
      dimension(
        "motivation",
        "Motivation & fit",
        "Specific reasons for this role",
      ),
      dimension(
        "conciseness",
        "Conciseness",
        "Answers that land without rambling",
      ),
      dimension(
        "logistics",
        "Logistics",
        "Confident handling of practical questions",
      ),
    ],
    tracksCompetencies: true,
    usesCodeEditor: false,
  },
  coding: {
    label: "Coding",
    summary: "Solve a problem live while explaining your thinking.",
    persona:
      "a senior engineer running a live coding interview. You can see the candidate's editor activity, including code they wrote and then deleted and how long they paused. Do not hand over the solution. Ask what they are considering, nudge with questions, and probe edge cases and complexity.",
    dimensions: [
      dimension(
        "understanding",
        "Problem understanding",
        "Clarifying before coding",
      ),
      dimension(
        "communication",
        "Approach communication",
        "Thinking out loud coherently",
      ),
      dimension(
        "correctness",
        "Correctness of reasoning",
        "A sound, working approach",
      ),
      dimension(
        "complexity",
        "Complexity analysis",
        "Accurate time and space reasoning",
      ),
      dimension(
        "edge_cases",
        "Edge cases",
        "Anticipating the inputs that break it",
      ),
      dimension(
        "independence",
        "Independence",
        "Progress without needing to be led",
      ),
    ],
    tracksCompetencies: false,
    usesCodeEditor: true,
  },
  system_design: {
    label: "System design",
    summary: "Design a system out loud, and defend the tradeoffs.",
    persona:
      "a staff engineer running a system design interview. Start from requirements, then push on scale, data modeling, and failure modes. Challenge choices to see whether the candidate can defend or revise them.",
    dimensions: [
      dimension(
        "requirements",
        "Requirements",
        "Clarifying scope and constraints first",
      ),
      dimension(
        "decomposition",
        "Decomposition",
        "Sensible components and boundaries",
      ),
      dimension(
        "data",
        "Data modeling",
        "Appropriate storage and access patterns",
      ),
      dimension("scaling", "Scaling", "Reasoning about growth and bottlenecks"),
      dimension(
        "tradeoffs",
        "Tradeoffs",
        "Naming and defending the choices made",
      ),
    ],
    tracksCompetencies: false,
    usesCodeEditor: false,
  },
  pm_case: {
    label: "PM case",
    summary: "Work a product case from user problem to metrics.",
    persona:
      "a product leader running a product case interview. Give the candidate a case, then let them drive. Push on who the user is, how they would prioritize, and how they would know it worked.",
    dimensions: [
      dimension(
        "structuring",
        "Structuring",
        "A clear framework for the problem",
      ),
      dimension(
        "empathy",
        "User empathy",
        "Grounded understanding of the user",
      ),
      dimension(
        "prioritization",
        "Prioritization",
        "Defensible ordering of what matters",
      ),
      dimension("metrics", "Metrics", "How success would actually be measured"),
      dimension(
        "tradeoffs",
        "Tradeoffs",
        "Honest handling of what gets sacrificed",
      ),
    ],
    tracksCompetencies: true,
    usesCodeEditor: false,
  },
  resume_deep_dive: {
    label: "Resume deep-dive",
    summary: "Line-by-line pressure on what you actually did.",
    persona:
      "an engineer conducting a resume deep-dive. Pick specific claims from the candidate's background and drill into them. Ask what they personally built, which decisions were theirs, and what the measurable result was. Politely surface anything that sounds inflated or unsupported.",
    dimensions: [
      dimension("depth", "Ownership depth", "Real detail behind each claim"),
      dimension(
        "accuracy",
        "Technical accuracy",
        "Correct, precise technical detail",
      ),
      dimension(
        "consistency",
        "Consistency with evidence",
        "Answers match their recorded evidence",
      ),
      dimension(
        "impact",
        "Impact articulation",
        "Clear statement of what changed",
      ),
    ],
    tracksCompetencies: true,
    usesCodeEditor: false,
  },
};

/** Candidate turns before the interviewer should wrap up. */
export const TURN_BUDGETS: Record<InterviewLength, number> = {
  quick: 4,
  standard: 8,
  full: 16,
};

/** Hard session ceiling, which also bounds realtime voice spend. */
export const LENGTH_MINUTES: Record<InterviewLength, number> = {
  quick: 10,
  standard: 20,
  full: 45,
};

export const INTENSITY_DIRECTION: Record<InterviewIntensity, string> = {
  gentle:
    "Be warm and encouraging. Accept a reasonable answer and move on. Offer a hint if the candidate stalls.",
  realistic:
    "Be professional and neutral, like a real interview. Follow up once when an answer is thin, then move on.",
  demanding:
    "Be rigorous. Push back on vague claims, ask for numbers, and follow up more than once when an answer does not hold up. Stay respectful and never hostile.",
};

/** Unprompted coding interjections allowed, so spend stays bounded. */
export const INTERJECTION_BUDGET: Record<InterviewIntensity, number> = {
  gentle: 0,
  realistic: 0,
  demanding: 2,
};
