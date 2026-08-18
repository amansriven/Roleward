"use client";

import {
  ArrowRight,
  Check,
  Braces,
  Lightbulb,
  LoaderCircle,
  Play,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  EXECUTABLE_LANGUAGES,
  isExecutable,
  LANGUAGE_LABELS,
  LANGUAGES,
  VERDICT_LABELS,
  type ExecutionResult,
  type Language,
} from "@/modules/execution/port";
import type { Difficulty } from "@/modules/guru/archetypes";
import type { CoachingPoint, PracticeGate } from "@/modules/guru/practice";
import type { ClientProblem } from "@/modules/guru/schema";
import { renderStub } from "@/modules/guru/stubs";

/**
 * The practice loop.
 *
 * Ordered deliberately: classify, then commit to a cost, then write code. A
 * candidate who can implement but cannot recognize will pass every judge and
 * fail every interview, so the recognition step happens first and is graded
 * separately. Nothing is revealed until the end — learning you guessed wrong
 * before writing a line would turn the gate into a hint.
 */
type Stage = "pick" | "classify" | "commit" | "solve" | "coaching";

/**
 * Ids and names only, handed down from the server.
 *
 * Importing the archetype module here would bundle every `tell` into the page,
 * and the tell is hint number one. The confusableWith lists would give away how
 * the classification gate is built, too.
 */
export interface ArchetypeOption {
  id: string;
  name: string;
}

export interface RecommendationView {
  archetypeId: string;
  archetypeName: string;
  difficulty: Difficulty;
  reason: string;
  estimatedMinutes: number;
}

export interface SkillObservationView {
  skill: string;
  score: number;
}

interface Reveal {
  archetype: { id: string; name: string; tell: string } | null;
  expectedComplexity: { time: string; space: string };
  edgeCases: string[];
  followUps: { prompt: string; lookingFor: string }[];
  chosenClassification: string | null;
  classificationCorrect: boolean;
  chosenComplexity: string | null;
  complexityCorrect: boolean;
  chosenEdgeCases: string[];
  edgeCasesScore: number | null;
  solved: boolean;
  hintsUsed: number;
  runs: number;
}

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

const ORDERED_LANGUAGES: Language[] = [
  ...EXECUTABLE_LANGUAGES,
  ...LANGUAGES.filter((item) => !isExecutable(item)),
];

export function PracticeFlow({
  archetypes,
  skillLabels,
  recommendation,
}: {
  archetypes: ArchetypeOption[];
  /** Passed down rather than imported, to keep archetypes.ts out of this bundle. */
  skillLabels: Record<string, string>;
  recommendation: RecommendationView | null;
}) {
  const [stage, setStage] = useState<Stage>("pick");
  const [archetypeId, setArchetypeId] = useState<string>("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");

  const [problem, setProblem] = useState<ClientProblem | null>(null);
  const [gate, setGate] = useState<PracticeGate | null>(null);
  const [classification, setClassification] = useState("");
  const [complexity, setComplexity] = useState("");
  const [edgeCases, setEdgeCases] = useState<string[]>([]);

  const [language, setLanguage] = useState<Language>(
    EXECUTABLE_LANGUAGES[0] ?? "python",
  );
  const [code, setCode] = useState("");
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [hints, setHints] = useState<string[]>([]);
  const [coaching, setCoaching] = useState<CoachingPoint[]>([]);
  const [skills, setSkills] = useState<SkillObservationView[]>([]);
  const [reveal, setReveal] = useState<Reveal | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/guru/problem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          archetypeId: archetypeId || undefined,
          difficulty,
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        problem?: ClientProblem;
        gate?: PracticeGate;
        error?: string;
      } | null;
      if (!response.ok || !body?.problem || !body.gate) {
        setError(body?.error ?? "Guru could not find a problem.");
        return;
      }
      setProblem(body.problem);
      setGate(body.gate);
      setCode(renderStub(body.problem.signature, language));
      setStage("classify");
    } catch {
      setError("Guru could not reach the problem pool.");
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!problem) return;
    setBusy(true);
    try {
      await fetch("/api/guru/attempt", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "commit",
          problemId: problem.id,
          classification,
          complexity,
          edgeCases,
        }),
      });
      setStage("solve");
    } finally {
      setBusy(false);
    }
  }

  async function takeHint() {
    if (!problem) return;
    setBusy(true);
    try {
      const response = await fetch("/api/guru/attempt", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "hint", problemId: problem.id }),
      });
      const body = (await response.json().catch(() => null)) as {
        hint?: string | null;
      } | null;
      if (body?.hint) setHints((current) => [...current, body.hint!]);
    } finally {
      setBusy(false);
    }
  }

  async function run() {
    if (!problem) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/guru/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ problemId: problem.id, language, code }),
      });
      const body = (await response.json().catch(() => null)) as {
        result?: ExecutionResult;
        error?: string;
      } | null;
      if (!response.ok) {
        setError(body?.error ?? "Guru could not run that.");
        return;
      }
      setResult(body?.result ?? null);
    } catch {
      setError("Guru could not reach the judge.");
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    if (!problem) return;
    setBusy(true);
    try {
      const response = await fetch("/api/guru/attempt", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "finish", problemId: problem.id }),
      });
      const body = (await response.json().catch(() => null)) as {
        coaching?: CoachingPoint[];
        reveal?: Reveal;
        skills?: SkillObservationView[];
      } | null;
      setCoaching(body?.coaching ?? []);
      setSkills(body?.skills ?? []);
      setReveal(body?.reveal ?? null);
      setStage("coaching");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setStage("pick");
    setProblem(null);
    setGate(null);
    setClassification("");
    setComplexity("");
    setEdgeCases([]);
    setCode("");
    setResult(null);
    setHints([]);
    setCoaching([]);
    setSkills([]);
    setReveal(null);
    setError("");
  }

  function switchLanguage(next: Language) {
    if (
      problem &&
      code.trim() === renderStub(problem.signature, language).trim()
    )
      setCode(renderStub(problem.signature, next));
    setLanguage(next);
  }

  return (
    <div className="space-y-4">
      <Steps stage={stage} />
      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-400">
          {error}
        </p>
      )}

      {stage === "pick" && (
        <PickStage
          archetypes={archetypes}
          recommendation={recommendation}
          onAcceptRecommendation={() => {
            if (!recommendation) return;
            setArchetypeId(recommendation.archetypeId);
            setDifficulty(recommendation.difficulty);
          }}
          archetypeId={archetypeId}
          setArchetypeId={setArchetypeId}
          difficulty={difficulty}
          setDifficulty={setDifficulty}
          busy={busy}
          onStart={() => void start()}
        />
      )}

      {stage === "classify" && problem && gate && (
        <div className="border-iron/80 bg-workshop/75 space-y-5 rounded-2xl border p-5">
          <Statement problem={problem} />
          <div>
            <p className="text-sm font-semibold">
              Before you write anything: what kind of problem is this?
            </p>
            <p className="text-dust mt-1 text-xs">
              Naming the pattern is the part interviews select for. You will not
              be told whether you are right until the end.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {gate.classification.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => setClassification(choice.id)}
                  className={cn(
                    "rounded-xl border p-3 text-left text-xs font-semibold transition",
                    classification === choice.id
                      ? "border-cobalt bg-cobalt/10 text-linen"
                      : "border-iron text-canvas hover:text-linen",
                  )}
                >
                  {choice.name}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            disabled={!classification}
            onClick={() => setStage("commit")}
            className="bg-cobalt inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-xs font-semibold text-white disabled:opacity-40"
          >
            Continue <ArrowRight className="size-3.5" />
          </button>
        </div>
      )}

      {stage === "commit" && problem && gate && (
        <div className="border-iron/80 bg-workshop/75 space-y-5 rounded-2xl border p-5">
          <Statement problem={problem} />
          <div>
            <p className="text-sm font-semibold">
              What should the optimal solution cost?
            </p>
            <p className="text-dust mt-1 text-xs">
              Commit before you code. Deciding the target afterwards is how you
              end up defending whatever you happened to write.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {gate.complexity.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => setComplexity(choice)}
                  className={cn(
                    "rounded-xl border p-3 text-left font-mono text-xs transition",
                    complexity === choice
                      ? "border-cobalt bg-cobalt/10 text-linen"
                      : "border-iron text-canvas hover:text-linen",
                  )}
                >
                  {choice}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold">
              Which of these actually bite on this problem?
            </p>
            <p className="text-dust mt-1 text-xs">
              Some of these matter here and some never come up. Naming every one
              is not the same as knowing which break your approach.
            </p>
            <div className="mt-4 grid gap-2">
              {gate.edgeCases.map((choice) => {
                const chosen = edgeCases.includes(choice);
                return (
                  <button
                    key={choice}
                    type="button"
                    onClick={() =>
                      setEdgeCases((current) =>
                        chosen
                          ? current.filter((item) => item !== choice)
                          : [...current, choice],
                      )
                    }
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border p-3 text-left text-xs transition",
                      chosen
                        ? "border-cobalt bg-cobalt/10 text-linen"
                        : "border-iron text-canvas hover:text-linen",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded border",
                        chosen ? "border-cobalt bg-cobalt" : "border-iron",
                      )}
                    >
                      {chosen && <Check className="size-3 text-white" />}
                    </span>
                    {choice}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            disabled={!complexity || busy}
            onClick={() => void commit()}
            className="bg-cobalt inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-xs font-semibold text-white disabled:opacity-40"
          >
            {busy ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : (
              <ArrowRight className="size-3.5" />
            )}
            Start coding
          </button>
        </div>
      )}

      {stage === "solve" && problem && (
        <SolveStage
          problem={problem}
          language={language}
          onLanguage={switchLanguage}
          code={code}
          onCode={setCode}
          result={result}
          hints={hints}
          busy={busy}
          onHint={() => void takeHint()}
          onRun={() => void run()}
          onFinish={() => void finish()}
        />
      )}

      {stage === "coaching" && (
        <CoachingStage
          coaching={coaching}
          reveal={reveal}
          skills={skills}
          skillLabels={skillLabels}
          onAgain={reset}
        />
      )}
    </div>
  );
}

const STEPS: { stage: Stage; label: string }[] = [
  { stage: "pick", label: "Choose" },
  { stage: "classify", label: "Classify" },
  { stage: "commit", label: "Commit" },
  { stage: "solve", label: "Solve" },
  { stage: "coaching", label: "Coaching" },
];

function Steps({ stage }: { stage: Stage }) {
  const current = STEPS.findIndex((item) => item.stage === stage);
  return (
    <ol className="flex flex-wrap items-center gap-2">
      {STEPS.map((item, index) => (
        <li key={item.stage} className="flex items-center gap-2">
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold",
              index < current && "border-sage/40 text-sage",
              index === current && "border-cobalt bg-cobalt/10 text-linen",
              index > current && "border-iron text-dust",
            )}
          >
            {index < current && <Check className="size-3" />}
            {item.label}
          </span>
          {index < STEPS.length - 1 && (
            <span className="bg-iron h-px w-4" aria-hidden />
          )}
        </li>
      ))}
    </ol>
  );
}

function Statement({ problem }: { problem: ClientProblem }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold">{problem.title}</p>
        <span className="border-iron text-dust rounded-full border px-2 py-0.5 text-[10px] capitalize">
          {problem.difficulty}
        </span>
      </div>
      <p className="text-canvas mt-3 text-xs leading-6 whitespace-pre-line">
        {problem.statement}
      </p>
      {problem.constraints.length > 0 && (
        <ul className="text-dust mt-3 space-y-1 text-[11px]">
          {problem.constraints.map((line) => (
            <li key={line}>· {line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PickStage({
  archetypes,
  recommendation,
  onAcceptRecommendation,
  archetypeId,
  setArchetypeId,
  difficulty,
  setDifficulty,
  busy,
  onStart,
}: {
  archetypes: ArchetypeOption[];
  recommendation: RecommendationView | null;
  onAcceptRecommendation: () => void;
  archetypeId: string;
  setArchetypeId: (value: string) => void;
  difficulty: Difficulty;
  setDifficulty: (value: Difficulty) => void;
  busy: boolean;
  onStart: () => void;
}) {
  return (
    <div className="border-iron/80 bg-workshop/75 space-y-5 rounded-2xl border p-5">
      <div>
        <p className="text-sm font-semibold">What do you want to practice?</p>
        <p className="text-dust mt-1 text-xs">
          Every problem is generated and proved correct before you see it, so
          there is nothing to memorize and nothing to look up.
        </p>
      </div>

      {recommendation && (
        <div className="border-cobalt/40 bg-cobalt/5 rounded-xl border p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="text-cobalt size-3.5" />
            <p className="text-xs font-semibold">Recommended next</p>
          </div>
          <p className="text-canvas mt-2 text-xs leading-6">
            {recommendation.reason}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onAcceptRecommendation}
              className="border-cobalt/60 text-linen hover:bg-cobalt/10 inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold"
            >
              {recommendation.archetypeName}
              <span className="text-dust capitalize">
                · {recommendation.difficulty} · ~
                {recommendation.estimatedMinutes} min
              </span>
            </button>
          </div>
        </div>
      )}

      <div>
        <p className="section-label">Pattern</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setArchetypeId("")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition",
              archetypeId === ""
                ? "border-cobalt bg-cobalt/10 text-linen"
                : "border-iron text-canvas hover:text-linen",
            )}
          >
            <Sparkles className="size-3.5" />
            Surprise me
          </button>
          {archetypes.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setArchetypeId(item.id)}
              className={cn(
                "rounded-lg border px-3 py-2 text-xs font-semibold transition",
                archetypeId === item.id
                  ? "border-cobalt bg-cobalt/10 text-linen"
                  : "border-iron text-canvas hover:text-linen",
              )}
            >
              {item.name}
            </button>
          ))}
        </div>
        {archetypeId === "" && (
          <p className="text-dust mt-3 text-[11px]">
            Picking the pattern yourself makes the next step easy. Surprise me
            is the honest test of whether you can recognize it.
          </p>
        )}
      </div>

      <div>
        <p className="section-label">Difficulty</p>
        <div className="mt-3 flex gap-2">
          {DIFFICULTIES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setDifficulty(item)}
              className={cn(
                "rounded-lg border px-3 py-2 text-xs font-semibold capitalize transition",
                difficulty === item
                  ? "border-cobalt bg-cobalt/10 text-linen"
                  : "border-iron text-canvas hover:text-linen",
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onStart}
        disabled={busy}
        className="bg-cobalt inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-xs font-semibold text-white disabled:opacity-40"
      >
        {busy ? (
          <LoaderCircle className="size-3.5 animate-spin" />
        ) : (
          <Play className="size-3.5" />
        )}
        {busy ? "Finding a problem…" : "Start practising"}
      </button>
    </div>
  );
}

function SolveStage({
  problem,
  language,
  onLanguage,
  code,
  onCode,
  result,
  hints,
  busy,
  onHint,
  onRun,
  onFinish,
}: {
  problem: ClientProblem;
  language: Language;
  onLanguage: (value: Language) => void;
  code: string;
  onCode: (value: string) => void;
  result: ExecutionResult | null;
  hints: string[];
  busy: boolean;
  onHint: () => void;
  onRun: () => void;
  onFinish: () => void;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[.85fr_1.15fr]">
      <div className="border-iron/80 bg-workshop/75 space-y-5 rounded-2xl border p-5">
        <Statement problem={problem} />

        <div>
          <p className="section-label">Examples</p>
          <div className="mt-3 space-y-2">
            {problem.tests.slice(0, 3).map((test, index) => (
              <div
                key={index}
                className="border-iron/70 rounded-lg border p-2.5 font-mono text-[10px] leading-5"
              >
                <p className="text-canvas break-all">
                  {problem.signature.name}
                  {JSON.stringify(test.input)
                    .replace(/^\[/, "(")
                    .replace(/\]$/, ")")}
                </p>
                <p className="text-dust break-all">
                  → {JSON.stringify(test.expected)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="section-label">Hints</p>
            <button
              type="button"
              onClick={onHint}
              disabled={busy || hints.length >= 3}
              className="border-iron text-canvas hover:text-linen inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-40"
            >
              <Lightbulb className="size-3" />
              {hints.length >= 3
                ? "No more"
                : `Take a hint (${3 - hints.length})`}
            </button>
          </div>
          {hints.length === 0 ? (
            <p className="text-dust mt-3 text-[11px]">
              Untimed, and hints do not cost you the problem — they are
              recorded, so &ldquo;solved unaided&rdquo; keeps meaning something.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {hints.map((hint, index) => (
                <li
                  key={index}
                  className="border-iron/70 text-canvas rounded-lg border p-2.5 text-[11px] leading-5"
                >
                  {hint}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="border-iron/80 bg-workshop/75 flex min-h-[28rem] flex-col overflow-hidden rounded-2xl border">
        <div className="border-iron/70 flex items-center justify-between border-b px-4 py-2">
          <div className="flex items-center gap-2">
            <Braces className="text-cobalt size-3.5" />
            <select
              value={language}
              onChange={(event) => onLanguage(event.target.value as Language)}
              aria-label="Language"
              className="bg-transparent text-xs outline-none"
            >
              {ORDERED_LANGUAGES.map((item) => (
                <option key={item} value={item} className="bg-workshop">
                  {LANGUAGE_LABELS[item]}
                  {isExecutable(item) ? "" : " (editor only)"}
                </option>
              ))}
            </select>
          </div>
          <span className="text-dust font-mono text-[10px]">
            {code.split("\n").length} lines
          </span>
        </div>

        <div className="min-h-0 flex-1 bg-[#18191e]">
          <textarea
            value={code}
            onChange={(event) => onCode(event.target.value)}
            spellCheck={false}
            aria-label="Solution"
            className="text-linen h-full w-full resize-none bg-transparent p-4 font-mono text-xs leading-6 outline-none"
          />
        </div>

        {result && (
          <div className="border-iron/70 max-h-48 overflow-y-auto border-t p-3">
            <div className="flex items-center justify-between gap-3">
              <span
                className={cn(
                  "text-xs font-semibold",
                  result.verdict === "accepted" ? "text-sage" : "text-red-400",
                )}
              >
                {VERDICT_LABELS[result.verdict]}
              </span>
              <span className="text-dust font-mono text-[10px]">
                {result.passed}/{result.total} tests
              </span>
            </div>
            {result.message && (
              <pre className="text-dust mt-2 overflow-x-auto font-mono text-[10px] leading-4 whitespace-pre-wrap">
                {result.message}
              </pre>
            )}
            <div className="mt-2 space-y-1.5">
              {result.outcomes
                .filter((outcome) => !outcome.passed)
                .slice(0, 4)
                .map((outcome) => (
                  <div key={outcome.index} className="flex items-start gap-2">
                    <X className="mt-0.5 size-3 shrink-0 text-red-400" />
                    <div className="min-w-0 font-mono text-[10px] leading-4">
                      <p className="text-canvas break-all">
                        {JSON.stringify(problem.tests[outcome.index]?.input)}
                      </p>
                      <p className="text-dust break-all">
                        expected{" "}
                        {JSON.stringify(problem.tests[outcome.index]?.expected)}
                        , got {JSON.stringify(outcome.actual)}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="border-iron/70 flex items-center justify-between gap-3 border-t p-3">
          <button
            type="button"
            onClick={onFinish}
            disabled={busy}
            className="border-iron text-canvas hover:text-linen inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold disabled:opacity-40"
          >
            Finish & see coaching
          </button>
          <button
            type="button"
            onClick={onRun}
            disabled={busy || !isExecutable(language) || !code.trim()}
            title={
              isExecutable(language)
                ? "Run against the tests"
                : `${LANGUAGE_LABELS[language]} cannot be run yet`
            }
            className="bg-cobalt inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-white disabled:opacity-40"
          >
            {busy ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : (
              <Play className="size-3.5" />
            )}
            Run tests
          </button>
        </div>
      </div>
    </div>
  );
}

function CoachingStage({
  coaching,
  reveal,
  skills,
  skillLabels,
  onAgain,
}: {
  coaching: CoachingPoint[];
  reveal: Reveal | null;
  skills: SkillObservationView[];
  skillLabels: Record<string, string>;
  onAgain: () => void;
}) {
  return (
    <div className="space-y-4">
      {reveal?.archetype && (
        <div className="border-iron/80 bg-workshop/75 rounded-2xl border p-5">
          <p className="section-label">The pattern</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-lg font-semibold">{reveal.archetype.name}</p>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                reveal.classificationCorrect
                  ? "border-sage/40 text-sage"
                  : "border-red-500/40 text-red-400",
              )}
            >
              {reveal.classificationCorrect ? (
                <Check className="size-3" />
              ) : (
                <X className="size-3" />
              )}
              {reveal.classificationCorrect
                ? "You named it"
                : "You said something else"}
            </span>
          </div>
          <p className="text-canvas mt-3 text-xs leading-6">
            {reveal.archetype.tell}
          </p>
          <div className="border-iron/70 mt-4 flex flex-wrap gap-x-8 gap-y-2 border-t pt-4 font-mono text-[11px]">
            <span className="text-dust">
              target{" "}
              <span
                className={
                  reveal.complexityCorrect ? "text-sage" : "text-red-400"
                }
              >
                {reveal.expectedComplexity.time}
              </span>
              {!reveal.complexityCorrect && reveal.chosenComplexity && (
                <span className="text-dust">
                  {" "}
                  · you said {reveal.chosenComplexity}
                </span>
              )}
            </span>
            <span className="text-dust">
              runs <span className="text-canvas">{reveal.runs}</span>
            </span>
            <span className="text-dust">
              hints <span className="text-canvas">{reveal.hintsUsed}</span>
            </span>
          </div>
        </div>
      )}

      {skills.length > 0 && (
        <div className="border-iron/80 bg-workshop/75 rounded-2xl border p-5">
          <p className="section-label">What this session measured</p>
          <p className="text-dust mt-1 text-xs">
            Only the skills this problem actually tested. Guru cannot hear you
            explain, so it does not pretend to score that.
          </p>
          <div className="mt-4 space-y-3">
            {skills.map((item) => (
              <div key={item.skill}>
                <div className="mb-1.5 flex justify-between gap-3 text-xs">
                  <span className="text-canvas">
                    {skillLabels[item.skill] ?? item.skill}
                  </span>
                  <span className="text-dust font-mono">
                    {item.score.toFixed(1)}/10
                  </span>
                </div>
                <div className="bg-iron h-1.5 rounded-full">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      item.score >= 7 ? "bg-sage" : "bg-cobalt",
                    )}
                    style={{ width: `${item.score * 10}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {coaching.map((point) => (
          <div
            key={point.title}
            className={cn(
              "rounded-2xl border p-4",
              point.tone === "good"
                ? "border-sage/30 bg-sage/5"
                : "border-iron/80 bg-workshop/75",
            )}
          >
            <div className="flex items-center gap-2">
              {point.tone === "good" ? (
                <Check className="text-sage size-3.5" />
              ) : (
                <ArrowRight className="text-cobalt size-3.5" />
              )}
              <p className="text-xs font-semibold">{point.title}</p>
            </div>
            <p className="text-canvas mt-2 text-[11px] leading-5">
              {point.detail}
            </p>
          </div>
        ))}
      </div>

      {reveal && reveal.followUps.length > 0 && (
        <div className="border-iron/80 bg-workshop/75 rounded-2xl border p-5">
          <p className="section-label">What an interviewer would ask next</p>
          <ul className="mt-3 space-y-3">
            {reveal.followUps.map((item) => (
              <li key={item.prompt}>
                <p className="text-canvas text-xs">{item.prompt}</p>
                <p className="text-dust mt-1 text-[11px] leading-5">
                  A strong answer covers: {item.lookingFor}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={onAgain}
        className="bg-cobalt inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-xs font-semibold text-white"
      >
        <RotateCcw className="size-3.5" />
        Practise another
      </button>
    </div>
  );
}
