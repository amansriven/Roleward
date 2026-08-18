import { auth } from "@/auth";
import { workspaceStorageConfigured } from "@/modules/aws/config";
import { listAttempts } from "@/modules/aws/practice-store";
import { PracticeFlow } from "@/components/guru/practice-flow";
import { Metric, PageIntro, Panel } from "@/components/workspace/dashboard-ui";
import { ARCHETYPES, CODING_SKILL_LABELS } from "@/modules/guru/archetypes";
import { summarizeMastery } from "@/modules/guru/practice";
import { aggregateSkills, recommendNext } from "@/modules/guru/skills";

export const dynamic = "force-dynamic";

export default async function GuruPage() {
  const session = await auth();
  const attempts =
    session?.user?.id && workspaceStorageConfigured
      ? await listAttempts(session.user.id).catch(() => [])
      : [];

  // Every number below is counted from real attempts. The page used to show
  // invented ones, which is worse than showing none.
  const mastery = summarizeMastery(
    attempts.map((attempt) => ({
      archetypeId: attempt.archetypeId,
      classificationCorrect: attempt.classificationCorrect,
      solved: attempt.solved,
      hintsUsed: attempt.hintsUsed,
      completedAt: attempt.completedAt,
    })),
  );
  const skillInputs = attempts.map((attempt) => ({
    archetypeId: attempt.archetypeId,
    difficulty: attempt.difficulty,
    classificationCorrect: attempt.classificationCorrect,
    complexityCorrect: attempt.complexityCorrect,
    edgeCasesScore: attempt.edgeCasesScore,
    solved: attempt.solved,
    hintsUsed: attempt.hintsUsed,
    runs: attempt.runs,
    completedAt: attempt.completedAt,
  }));
  const skills = aggregateSkills(skillInputs);
  const lastDifficulty = new Map(
    [...attempts]
      .sort((left, right) =>
        (left.completedAt ?? "").localeCompare(right.completedAt ?? ""),
      )
      .map((attempt) => [attempt.archetypeId, attempt.difficulty]),
  );
  const recommendation = recommendNext(
    mastery.map((item) => ({
      archetypeId: item.archetypeId,
      name: item.name,
      attempts: item.attempts,
      solvedUnaided: item.solvedUnaided,
      recognized: item.recognized,
      strength: item.strength,
      lastDifficulty: lastDifficulty.get(item.archetypeId) ?? null,
    })),
    skills,
    ARCHETYPES.filter(
      (item) => !mastery.some((seen) => seen.archetypeId === item.id),
    ).map((item) => ({ id: item.id, name: item.name })),
  );

  const solved = attempts.filter((attempt) => attempt.solved);
  const unaided = solved.filter((attempt) => attempt.hintsUsed === 0);
  const recognized = attempts.filter(
    (attempt) => attempt.classificationCorrect,
  );

  return (
    <div className="theme-guru space-y-7">
      <PageIntro
        eyebrow="Guru"
        title="Practice the gap that matters next."
        copy="Every problem is generated for you and proved correct by running it, so there is nothing to memorize. Guru scores recognizing the pattern separately from implementing it — untimed, with hints. Stage Fright is the timed counterpart."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Panel className="p-5">
          <Metric
            label="Problems attempted"
            value={String(attempts.length)}
            note={
              attempts.length
                ? `${solved.length} solved · ${unaided.length} unaided`
                : "Nothing yet"
            }
          />
        </Panel>
        <Panel className="p-5">
          <Metric
            label="Pattern recognized"
            value={
              attempts.length
                ? `${Math.round((recognized.length / attempts.length) * 100)}%`
                : "—"
            }
            note={
              attempts.length
                ? `${recognized.length} of ${attempts.length} named before coding`
                : "Classify a problem to start"
            }
          />
        </Panel>
        <Panel className="p-5">
          <Metric
            label="Archetypes touched"
            value={`${mastery.length}/${ARCHETYPES.length}`}
            note={
              mastery.length
                ? `Weakest: ${mastery[0]?.name}`
                : "All still unpractised"
            }
          />
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_.6fr]">
        <PracticeFlow
          archetypes={ARCHETYPES.map((item) => ({
            id: item.id,
            name: item.name,
          }))}
          skillLabels={CODING_SKILL_LABELS}
          recommendation={recommendation}
        />

        <div className="space-y-5">
          <Panel className="p-5">
            <p className="font-semibold">Competency graph</p>
            <p className="text-dust mt-1 text-xs">
              Skills, not topics. A topic score cannot tell you whether you
              misread the problem or just wrote a buggy loop, and those need
              different practice.
            </p>
            <div className="mt-6 space-y-4">
              {skills.map((item) => (
                <div key={item.skill}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs">
                    <span className="text-canvas truncate">{item.label}</span>
                    <span className="text-dust shrink-0 font-mono">
                      {item.score === null
                        ? "—"
                        : `${item.score.toFixed(1)}/10`}
                    </span>
                  </div>
                  <div className="bg-iron h-1.5 rounded-full">
                    {item.score !== null && (
                      <div
                        className="bg-cobalt h-full rounded-full"
                        style={{ width: `${item.score * 10}%` }}
                      />
                    )}
                  </div>
                  <p className="text-dust mt-1.5 text-[10px]">
                    {item.score === null
                      ? item.measuredBy === "stage_fright"
                        ? "Needs a spoken interview — Stage Fright measures this"
                        : "Not measured yet"
                      : `${item.samples} sample${item.samples === 1 ? "" : "s"}`}
                  </p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="p-5">
            <p className="font-semibold">Where you stand</p>
            <p className="text-dust mt-1 text-xs">
              Weighted toward naming the pattern and solving without hints,
              since those are what transfer to an interview.
            </p>
            {mastery.length === 0 ? (
              <p className="text-dust mt-6 text-xs leading-6">
                No attempts yet. Finish one problem and this fills in with the
                archetypes you have actually practised — never with a guess.
              </p>
            ) : (
              <div className="mt-6 space-y-5">
                {mastery.slice(0, 8).map((item) => (
                  <div key={item.archetypeId}>
                    <div className="mb-2 flex justify-between gap-3 text-xs">
                      <span className="text-canvas truncate">{item.name}</span>
                      <span className="text-dust shrink-0 font-mono">
                        {item.strength}%
                      </span>
                    </div>
                    <div className="bg-iron h-1.5 rounded-full">
                      <div
                        className="bg-cobalt h-full rounded-full"
                        style={{ width: `${item.strength}%` }}
                      />
                    </div>
                    <p className="text-dust mt-1.5 text-[10px]">
                      {item.attempts} attempt{item.attempts === 1 ? "" : "s"} ·{" "}
                      {item.solvedUnaided} unaided
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
