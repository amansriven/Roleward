/**
 * Scores a résumé against the things recruiters actually screen on.
 *
 * Deliberately not a model call. "Rate this résumé out of ten" produces a
 * number nobody can act on and that changes between runs; every point here is
 * tied to a specific line, so the score doubles as the to-do list. A model is
 * useful for rewriting a weak bullet, not for deciding which one is weak.
 *
 * Pure, so all of it is testable.
 */

export interface ScoredClaim {
  id: string;
  content: string;
  itemId: string;
  itemTitle: string;
}

export interface ScoredResume {
  claims: ScoredClaim[];
  hasExperience: boolean;
  hasProjects: boolean;
  skillCount: number;
}

export type FindingSeverity = "high" | "medium" | "low";

export interface Finding {
  id: string;
  severity: FindingSeverity;
  title: string;
  detail: string;
  /** The bullets this is about, so the fix is one click from the finding. */
  claimIds: string[];
}

export interface ResumeScore {
  /** 0-100. */
  total: number;
  band: "needs work" | "getting there" | "strong";
  dimensions: {
    key: string;
    label: string;
    score: number;
    max: number;
    detail: string;
  }[];
  findings: Finding[];
}

/**
 * Openers that describe proximity to work rather than work.
 *
 * These are the single most common thing separating a student résumé from one
 * that gets a callback: "helped with the migration" and "ran the migration"
 * describe the same afternoon and read as different people.
 */
const WEAK_OPENERS = [
  "helped",
  "assisted",
  "worked on",
  "worked with",
  "participated",
  "responsible for",
  "involved in",
  "contributed to",
  "aided",
  "supported",
  "tasked with",
  "learned",
  "shadowed",
];

/** Words that fill a line without narrowing anything. */
const VAGUE_TERMS = [
  "various",
  "several",
  "some",
  "many",
  "different",
  "multiple things",
  "stuff",
  "things",
  "etc",
  "as needed",
  "other duties",
];

const IDEAL_MIN_WORDS = 8;
const IDEAL_MAX_WORDS = 34;

function words(text: string) {
  return text.trim().split(/\s+/).filter(Boolean);
}

function firstWord(text: string) {
  return (
    words(text)[0]
      ?.toLowerCase()
      .replace(/[^a-z]/g, "") ?? ""
  );
}

export function hasNumber(text: string) {
  return /\d/.test(text);
}

export function startsWeakly(text: string) {
  const lowered = text.trim().toLowerCase();
  return WEAK_OPENERS.some((opener) => lowered.startsWith(opener));
}

export function vagueTermsIn(text: string) {
  const lowered = ` ${text.toLowerCase()} `;
  return VAGUE_TERMS.filter((term) => lowered.includes(` ${term} `));
}

function band(total: number): ResumeScore["band"] {
  if (total >= 80) return "strong";
  if (total >= 55) return "getting there";
  return "needs work";
}

export function scoreResume(resume: ScoredResume): ResumeScore {
  const { claims } = resume;
  const total = claims.length;

  const quantified = claims.filter((claim) => hasNumber(claim.content));
  const unquantified = claims.filter((claim) => !hasNumber(claim.content));
  const weak = claims.filter((claim) => startsWeakly(claim.content));
  const vague = claims.filter(
    (claim) => vagueTermsIn(claim.content).length > 0,
  );
  const tooShort = claims.filter(
    (claim) => words(claim.content).length < IDEAL_MIN_WORDS,
  );
  const tooLong = claims.filter(
    (claim) => words(claim.content).length > IDEAL_MAX_WORDS,
  );

  const openers = new Map<string, ScoredClaim[]>();
  for (const claim of claims) {
    const opener = firstWord(claim.content);
    if (!opener) continue;
    openers.set(opener, [...(openers.get(opener) ?? []), claim]);
  }
  const repeated = [...openers.entries()].filter(
    ([, group]) => group.length >= 3,
  );

  // Ratios are computed against a floor, so a résumé with two bullets cannot
  // score perfectly on quantification by having one number in it.
  const denominator = Math.max(total, 4);

  const quantScore = total
    ? Math.round(Math.min(quantified.length / denominator, 1) * 30)
    : 0;
  const strengthScore = total
    ? Math.round((1 - Math.min(weak.length / denominator, 1)) * 20)
    : 0;
  const specificScore = total
    ? Math.round((1 - Math.min(vague.length / denominator, 1)) * 15)
    : 0;
  const lengthScore = total
    ? Math.round(
        (1 - Math.min((tooShort.length + tooLong.length) / denominator, 1)) *
          10,
      )
    : 0;
  const varietyScore =
    repeated.length === 0 ? 10 : repeated.length === 1 ? 5 : 0;
  const coverageScore =
    (resume.hasExperience ? 8 : 0) +
    (resume.hasProjects ? 4 : 0) +
    (resume.skillCount >= 5 ? 3 : resume.skillCount > 0 ? 1 : 0);

  const findings: Finding[] = [];

  if (unquantified.length)
    findings.push({
      id: "quantify",
      severity: "high",
      title: `${unquantified.length} of ${total} bullets have no number in them`,
      detail:
        "A number is what turns a claim into evidence. Scale, time saved, users reached, tests written — any of them. If you genuinely do not know the figure, an approximate one you can defend beats none.",
      claimIds: unquantified.map((claim) => claim.id),
    });

  if (weak.length)
    findings.push({
      id: "weak-openers",
      severity: "high",
      title: `${weak.length} ${weak.length === 1 ? "bullet describes" : "bullets describe"} proximity to the work rather than the work`,
      detail:
        "Openers like 'helped with' and 'worked on' describe the same afternoon as 'built' and 'shipped' but read as a different person. Say what you actually did.",
      claimIds: weak.map((claim) => claim.id),
    });

  if (vague.length)
    findings.push({
      id: "vague",
      severity: "medium",
      title: `${vague.length} ${vague.length === 1 ? "bullet uses" : "bullets use"} words that narrow nothing`,
      detail:
        "'Various', 'several', 'multiple' — a reader cannot picture any of these. Name the actual thing, or say how many.",
      claimIds: vague.map((claim) => claim.id),
    });

  if (tooShort.length)
    findings.push({
      id: "too-short",
      severity: "medium",
      title: `${tooShort.length} ${tooShort.length === 1 ? "bullet is" : "bullets are"} too short to say anything`,
      detail: `Under ${IDEAL_MIN_WORDS} words there is rarely room for what you did, how, and to what effect.`,
      claimIds: tooShort.map((claim) => claim.id),
    });

  if (tooLong.length)
    findings.push({
      id: "too-long",
      severity: "low",
      title: `${tooLong.length} ${tooLong.length === 1 ? "bullet runs" : "bullets run"} long`,
      detail: `Past ${IDEAL_MAX_WORDS} words a bullet stops being scanned. Split it or cut the setup.`,
      claimIds: tooLong.map((claim) => claim.id),
    });

  for (const [opener, group] of repeated)
    findings.push({
      id: `repeat-${opener}`,
      severity: "low",
      title: `${group.length} bullets start with "${opener}"`,
      detail:
        "Repetition makes a résumé read as one job done repeatedly. Vary the verb to match what each bullet actually describes.",
      claimIds: group.map((claim) => claim.id),
    });

  if (!resume.hasExperience)
    findings.push({
      id: "no-experience",
      severity: "medium",
      title: "No work experience is listed",
      detail:
        "Internships, research, part-time work, and teaching assistantships all count. If you have none yet, projects carry more weight — make sure they are detailed.",
      claimIds: [],
    });

  if (!resume.hasProjects)
    findings.push({
      id: "no-projects",
      severity: "low",
      title: "No projects are listed",
      detail:
        "Projects are where a student résumé shows what it chose to build rather than what it was assigned.",
      claimIds: [],
    });

  if (resume.skillCount === 0)
    findings.push({
      id: "no-skills",
      severity: "medium",
      title: "No skills section was found",
      detail:
        "Keyword filters read this section first. List the languages and tools you would be comfortable being asked about.",
      claimIds: [],
    });

  const totalScore =
    quantScore +
    strengthScore +
    specificScore +
    lengthScore +
    varietyScore +
    coverageScore;

  return {
    total: totalScore,
    band: band(totalScore),
    dimensions: [
      {
        key: "quantified",
        label: "Quantified results",
        score: quantScore,
        max: 30,
        detail: `${quantified.length} of ${total} bullets contain a number.`,
      },
      {
        key: "strength",
        label: "Ownership",
        score: strengthScore,
        max: 20,
        detail: weak.length
          ? `${weak.length} start with a weak opener.`
          : "No bullets hedge about what you did.",
      },
      {
        key: "specificity",
        label: "Specificity",
        score: specificScore,
        max: 15,
        detail: vague.length
          ? `${vague.length} use vague quantities.`
          : "Nothing vague found.",
      },
      {
        key: "length",
        label: "Bullet length",
        score: lengthScore,
        max: 10,
        detail: `${tooShort.length} too short, ${tooLong.length} too long.`,
      },
      {
        key: "variety",
        label: "Verb variety",
        score: varietyScore,
        max: 10,
        detail: repeated.length
          ? `${repeated.length} ${repeated.length === 1 ? "verb is" : "verbs are"} overused.`
          : "Openers are varied.",
      },
      {
        key: "coverage",
        label: "Section coverage",
        score: coverageScore,
        max: 15,
        detail:
          [
            resume.hasExperience ? "experience" : null,
            resume.hasProjects ? "projects" : null,
            resume.skillCount ? "skills" : null,
          ]
            .filter(Boolean)
            .join(", ") || "Nothing beyond education.",
      },
    ],
    findings: findings.sort(
      (left, right) =>
        ({ high: 0, medium: 1, low: 2 })[left.severity] -
        { high: 0, medium: 1, low: 2 }[right.severity],
    ),
  };
}
