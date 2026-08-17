import {
  COMPETENCIES,
  type Competency,
  type InterviewSummary,
  type InterviewType,
} from "./schema";

const behavioralTypes = new Set<InterviewType>([
  "behavioral",
  "recruiter_screen",
  "pm_case",
  "resume_deep_dive",
]);
const technicalTypes = new Set<InterviewType>(["coding", "system_design"]);

export interface BehavioralSignals {
  competenciesCovered: number;
  rehearsals: number;
  covered: Competency[];
  uncovered: Competency[];
}

export function behavioralSignals(
  summaries: InterviewSummary[],
): BehavioralSignals {
  const relevant = summaries.filter((item) => behavioralTypes.has(item.type));
  const covered = new Set<Competency>();
  for (const item of relevant)
    for (const competency of item.competenciesCovered) covered.add(competency);
  return {
    competenciesCovered: covered.size,
    rehearsals: relevant.length,
    covered: COMPETENCIES.filter((item) => covered.has(item)),
    uncovered: COMPETENCIES.filter((item) => !covered.has(item)),
  };
}

export interface TechnicalSignals {
  coverage: number;
  recencyDays: number | null;
  attempts: number;
}

export function technicalSignals(
  summaries: InterviewSummary[],
  now = new Date(),
): TechnicalSignals {
  const relevant = summaries.filter((item) => technicalTypes.has(item.type));
  if (!relevant.length) return { coverage: 0, recencyDays: null, attempts: 0 };
  const coverage = Math.round(
    relevant.reduce((total, item) => total + item.overallScore, 0) /
      relevant.length,
  );
  const mostRecent = relevant.reduce((latest, item) =>
    item.completedAt > latest.completedAt ? item : latest,
  );
  const elapsed = now.getTime() - new Date(mostRecent.completedAt).getTime();
  return {
    coverage,
    recencyDays: Math.max(0, Math.floor(elapsed / 86_400_000)),
    attempts: relevant.length,
  };
}

/** The competency to target next: least covered, stable order for ties. */
export function nextCompetency(summaries: InterviewSummary[]): Competency {
  const counts = new Map<Competency, number>(
    COMPETENCIES.map((item) => [item, 0]),
  );
  for (const summary of summaries)
    for (const competency of summary.competenciesCovered)
      counts.set(competency, (counts.get(competency) ?? 0) + 1);
  return COMPETENCIES.reduce((best, item) =>
    (counts.get(item) ?? 0) < (counts.get(best) ?? 0) ? item : best,
  );
}
