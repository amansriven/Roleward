import { Check, ChevronDown, Clock3, Code2 } from "lucide-react";
import { auth } from "@/auth";
import { PageIntro } from "@/components/workspace/dashboard-ui";
import { PracticeFlow } from "@/components/zed/practice-flow";
import { workspaceStorageConfigured } from "@/modules/aws/config";
import { listAttempts } from "@/modules/aws/practice-store";
import { ARCHETYPES, CODING_SKILL_LABELS } from "@/modules/zed/archetypes";
import { summarizeMastery } from "@/modules/zed/practice";
import { aggregateSkills, recommendNext } from "@/modules/zed/skills";

export const dynamic = "force-dynamic";

export default async function ZedPage() {
  const session = await auth();
  const attempts =
    session?.user?.id && workspaceStorageConfigured
      ? await listAttempts(session.user.id).catch(() => [])
      : [];

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
  const recognitionRate = attempts.length
    ? Math.round((recognized.length / attempts.length) * 100)
    : null;
  const archetypeNames = new Map(
    ARCHETYPES.map((item) => [item.id, item.name]),
  );
  const recentAttempts = [...attempts]
    .sort((left, right) =>
      (right.completedAt ?? "").localeCompare(left.completedAt ?? ""),
    )
    .slice(0, 5);

  return (
    <div className="space-y-10">
      <PageIntro
        icon={
          <span className="border-amber/25 bg-amber/[.06] text-amber flex size-14 shrink-0 items-center justify-center rounded-2xl border">
            <Code2 className="size-7" aria-hidden="true" />
          </span>
        }
        eyebrow="Zed"
        title="Technical practice"
        copy="Work through one problem at a time. Name the pattern, commit to an approach, write the solution, and review what actually happened."
      />

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_21rem] xl:gap-14">
        <section className="min-w-0">
          <div className="mb-5">
            <p className="section-label">Next session</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-.035em]">
              Choose the work. Start when you’re ready.
            </h2>
          </div>
          <PracticeFlow
            archetypes={ARCHETYPES.map((item) => ({
              id: item.id,
              name: item.name,
            }))}
            skillLabels={CODING_SKILL_LABELS}
            recommendation={recommendation}
          />
        </section>

        <aside className="border-iron/80 space-y-10 xl:border-l xl:pl-8">
          <section className="border-iron/80 flex items-center gap-4 border-y py-4">
            <span className="border-iron bg-amber/[.06] text-amber flex size-14 shrink-0 items-center justify-center rounded-2xl border">
              <Code2 className="size-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold">Zed</p>
              <p className="text-dust mt-1 text-xs leading-5">
                Your coach for pattern recognition, implementation, and clear
                technical reasoning.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold">At a glance</h2>
            <dl className="border-iron/80 mt-4 border-y">
              <SummaryRow
                label="Completed"
                value={String(attempts.length)}
                note={`${solved.length} solved`}
              />
              <SummaryRow
                label="Unaided"
                value={String(unaided.length)}
                note="Solved without a hint"
              />
              <SummaryRow
                label="Recognition"
                value={recognitionRate === null ? "—" : `${recognitionRate}%`}
                note="Pattern named before coding"
              />
            </dl>
          </section>

          <section>
            <h2 className="text-sm font-semibold">Recent sessions</h2>
            {recentAttempts.length ? (
              <ol className="mt-4 space-y-4">
                {recentAttempts.map((attempt) => (
                  <li
                    key={attempt.problemId}
                    className="flex items-start gap-3"
                  >
                    <span
                      className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border ${
                        attempt.solved
                          ? "border-sage/40 text-sage"
                          : "border-iron text-dust"
                      }`}
                    >
                      {attempt.solved ? (
                        <Check className="size-3" />
                      ) : (
                        <Clock3 className="size-2.5" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-canvas truncate text-xs font-medium">
                        {archetypeNames.get(attempt.archetypeId) ??
                          "Technical practice"}
                      </p>
                      <p className="text-dust mt-1 text-[10px] capitalize">
                        {attempt.difficulty}
                        {attempt.completedAt
                          ? ` · ${new Date(attempt.completedAt).toLocaleDateString()}`
                          : " · In progress"}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-dust mt-4 text-xs leading-5">
                Your completed sessions will appear here. Nothing is filled in
                until you actually practise.
              </p>
            )}
          </section>
        </aside>
      </div>

      <details className="group border-iron/80 border-y py-5">
        <summary className="flex list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
          <div>
            <p className="text-sm font-semibold">Skill breakdown</p>
            <p className="text-dust mt-1 text-xs">
              The detailed evidence behind Zed’s next recommendation.
            </p>
          </div>
          <ChevronDown className="text-dust size-4 transition-transform group-open:rotate-180" />
        </summary>

        <div className="border-iron/70 mt-8 grid gap-10 border-t pt-8 lg:grid-cols-2">
          <section>
            <h3 className="text-xs font-semibold tracking-wide uppercase">
              Transferable skills
            </h3>
            <div className="mt-5 space-y-4">
              {skills.map((item) => (
                <ProgressRow
                  key={item.skill}
                  label={item.label}
                  value={item.score === null ? null : item.score * 10}
                  display={
                    item.score === null ? "Not measured" : `${item.score}/10`
                  }
                />
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold tracking-wide uppercase">
              Patterns practised
            </h3>
            {mastery.length ? (
              <div className="mt-5 space-y-4">
                {mastery.slice(0, 8).map((item) => (
                  <ProgressRow
                    key={item.archetypeId}
                    label={item.name}
                    value={item.strength}
                    display={`${item.strength}%`}
                  />
                ))}
              </div>
            ) : (
              <p className="text-dust mt-5 text-xs leading-5">
                Complete one session to start a pattern history.
              </p>
            )}
          </section>
        </div>
      </details>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="border-iron/70 flex items-center justify-between gap-4 border-t py-4 first:border-t-0">
      <div>
        <dt className="text-canvas text-xs">{label}</dt>
        <dd className="text-dust mt-1 text-[10px]">{note}</dd>
      </div>
      <dd className="font-mono text-lg">{value}</dd>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  display,
}: {
  label: string;
  value: number | null;
  display: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4 text-xs">
        <span className="text-canvas truncate">{label}</span>
        <span className="text-dust shrink-0 font-mono text-[10px]">
          {display}
        </span>
      </div>
      <div className="bg-iron h-1 rounded-full">
        {value !== null && (
          <div
            className="bg-amber h-full rounded-full"
            style={{ width: `${value}%` }}
          />
        )}
      </div>
    </div>
  );
}
