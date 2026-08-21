"use client";

import {
  ArrowRight,
  Check,
  CheckCircle2,
  Braces,
  Clock3,
  Lightbulb,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Play,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { Difficulty } from "@/modules/zed/archetypes";
import type { CoachingPoint, PracticeGate } from "@/modules/zed/practice";
import type { ClientProblem } from "@/modules/zed/schema";
import { renderStub } from "@/modules/zed/stubs";
import { applySmartEnter, applyTab } from "@/modules/zed/editor";

/**
 * The practice loop.
 *
 * Ordered deliberately: classify, then commit to a cost, then write code. A
 * candidate who can implement but cannot recognize will pass every judge and
 * fail every interview, so the recognition step happens first and is graded
 * separately. Nothing is revealed until the end — learning you guessed wrong
 * before writing a line would turn the gate into a hint.
 */
type Stage = "pick" | "classify" | "commit" | "review" | "solve" | "coaching";

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

interface GateFeedback {
  archetype: { id: string; name: string; tell: string } | null;
  classificationCorrect: boolean;
  chosenClassification: string | null;
  expectedComplexity: { time: string; space: string };
  complexityCorrect: boolean;
  chosenComplexity: string | null;
  edgeCases: string[];
  chosenEdgeCases: string[];
  edgeCasesScore: number | null;
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
  const [gateFeedback, setGateFeedback] = useState<GateFeedback | null>(null);

  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function start(selection?: {
    archetypeId: string;
    difficulty: Difficulty;
  }) {
    if (selection) {
      setArchetypeId(selection.archetypeId);
      setDifficulty(selection.difficulty);
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/zed/problem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          archetypeId: selection?.archetypeId || archetypeId || undefined,
          difficulty: selection?.difficulty ?? difficulty,
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        problem?: ClientProblem;
        gate?: PracticeGate;
        error?: string;
      } | null;
      if (!response.ok || !body?.problem || !body.gate) {
        setError(body?.error ?? "Zed could not find a problem.");
        return;
      }
      setProblem(body.problem);
      setGate(body.gate);
      setCode(renderStub(body.problem.signature, language));
      setStage("classify");
    } catch {
      setError("Zed could not reach the problem pool.");
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!problem) return;
    setBusy(true);
    try {
      const response = await fetch("/api/zed/attempt", {
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
      const body = (await response.json().catch(() => null)) as {
        feedback?: GateFeedback;
        error?: string;
      } | null;
      if (!response.ok || !body?.feedback) {
        setError(body?.error ?? "Zed could not grade your plan.");
        return;
      }
      setGateFeedback(body.feedback);
      setStage("review");
    } finally {
      setBusy(false);
    }
  }

  async function takeHint() {
    if (!problem) return;
    setBusy(true);
    try {
      const response = await fetch("/api/zed/attempt", {
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
      const response = await fetch("/api/zed/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ problemId: problem.id, language, code }),
      });
      const body = (await response.json().catch(() => null)) as {
        result?: ExecutionResult;
        error?: string;
      } | null;
      if (!response.ok) {
        setError(body?.error ?? "Zed could not run that.");
        return;
      }
      setResult(body?.result ?? null);
    } catch {
      setError("Zed could not reach the judge.");
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    if (!problem) return;
    setBusy(true);
    try {
      const response = await fetch("/api/zed/attempt", {
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
    setExpanded(false);
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
    setGateFeedback(null);
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
      {stage !== "pick" && <Steps stage={stage} />}
      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-400">
          {error}
        </p>
      )}

      {stage === "pick" && (
        <PickStage
          archetypes={archetypes}
          recommendation={recommendation}
          onStartRecommendation={() => {
            if (!recommendation) return;
            void start({
              archetypeId: recommendation.archetypeId,
              difficulty: recommendation.difficulty,
            });
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
        <div className="border-iron/80 space-y-6 border-y py-6">
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
                      ? "border-amber bg-amber/10 text-linen"
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
            className="bg-amber text-night inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-xs font-semibold disabled:opacity-40"
          >
            Continue <ArrowRight className="size-3.5" />
          </button>
        </div>
      )}

      {stage === "commit" && problem && gate && (
        <div className="border-iron/80 space-y-6 border-y py-6">
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
                      ? "border-amber bg-amber/10 text-linen"
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
                        ? "border-amber bg-amber/10 text-linen"
                        : "border-iron text-canvas hover:text-linen",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded border",
                        chosen ? "border-amber bg-amber" : "border-iron",
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
            className="bg-amber text-night inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-xs font-semibold disabled:opacity-40"
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

      {stage === "review" && problem && gateFeedback && (
        <GateReview
          problem={problem}
          feedback={gateFeedback}
          archetypes={archetypes}
          onContinue={() => setStage("solve")}
        />
      )}

      {stage === "solve" && problem && (
        <SolveStage
          expanded={expanded}
          onToggleExpanded={() => setExpanded((current) => !current)}
          problem={problem}
          feedback={gateFeedback}
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
  { stage: "review", label: "Review" },
  { stage: "solve", label: "Solve" },
  { stage: "coaching", label: "Coaching" },
];

function Steps({ stage }: { stage: Stage }) {
  const current = STEPS.findIndex((item) => item.stage === stage);
  return (
    <ol className="border-iron/80 flex items-center gap-5 overflow-x-auto border-b pb-4">
      {STEPS.map((item, index) => (
        <li key={item.stage} className="flex shrink-0 items-center gap-2">
          <span
            className={cn(
              "flex items-center gap-1.5 text-[10px] font-semibold tracking-wide uppercase",
              index < current && "text-sage",
              index === current && "text-amber",
              index > current && "text-dust",
            )}
          >
            <span className="font-mono">0{index + 1}</span>
            {item.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Statement({
  problem,
  feedback,
}: {
  problem: ClientProblem;
  feedback?: GateFeedback | null;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold">{problem.title}</p>
        <span className="border-iron text-dust rounded-full border px-2 py-0.5 text-[10px] capitalize">
          {problem.difficulty}
        </span>
      </div>
      {feedback && (
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="border-sage/25 bg-sage/[.07] text-sage inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-[10px]">
            <Clock3 className="size-3" /> Target{" "}
            {feedback.expectedComplexity.time} time
          </span>
          <span className="border-iron bg-raised text-canvas rounded-lg border px-2.5 py-1.5 font-mono text-[10px]">
            {feedback.expectedComplexity.space} space
          </span>
        </div>
      )}
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

function GateReview({
  problem,
  feedback,
  archetypes,
  onContinue,
}: {
  problem: ClientProblem;
  feedback: GateFeedback;
  archetypes: ArchetypeOption[];
  onContinue: () => void;
}) {
  const chosenName =
    archetypes.find((item) => item.id === feedback.chosenClassification)
      ?.name ?? "Your selection";
  const actualEdges = new Set(feedback.edgeCases);
  return (
    <div className="roleward-card overflow-hidden rounded-[22px]">
      <div className="border-iron/70 border-b p-5 sm:p-6">
        <p className="section-label">Plan check</p>
        <h2 className="mt-2 text-xl font-semibold tracking-[-.035em]">
          Know the target before you code.
        </h2>
        <p className="text-dust mt-2 text-xs leading-5">
          Your choices are locked. Use this feedback to enter the editor with
          the right mental model.
        </p>
      </div>
      <div className="bg-iron/70 grid gap-px lg:grid-cols-3">
        <FeedbackCard
          correct={feedback.classificationCorrect}
          label="Pattern"
          answer={feedback.archetype?.name ?? "Unknown pattern"}
          chosen={feedback.classificationCorrect ? undefined : chosenName}
          detail={feedback.archetype?.tell}
        />
        <FeedbackCard
          correct={feedback.complexityCorrect}
          label="Time complexity"
          answer={feedback.expectedComplexity.time}
          chosen={
            feedback.complexityCorrect
              ? undefined
              : (feedback.chosenComplexity ?? undefined)
          }
          detail={`Space target: ${feedback.expectedComplexity.space}`}
          mono
        />
        <div className="bg-workshop p-5">
          <div className="flex items-center justify-between">
            <p className="text-dust text-[10px] font-semibold tracking-wide uppercase">
              Edge cases
            </p>
            <span className="text-canvas font-mono text-[10px]">
              {feedback.edgeCasesScore ?? 0}/10
            </span>
          </div>
          <ul className="mt-4 space-y-2">
            {feedback.chosenEdgeCases.map((item) => (
              <li
                key={item}
                className={cn(
                  "flex items-start gap-2 text-[11px] leading-5",
                  actualEdges.has(item) ? "text-sage" : "text-red-400",
                )}
              >
                {actualEdges.has(item) ? (
                  <Check className="mt-1 size-3 shrink-0" />
                ) : (
                  <X className="mt-1 size-3 shrink-0" />
                )}
                {item}
              </li>
            ))}
          </ul>
          {feedback.chosenEdgeCases.length === 0 && (
            <p className="text-dust mt-4 text-[11px]">
              No edge cases selected.
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <Statement problem={problem} feedback={feedback} />
        <button
          type="button"
          onClick={onContinue}
          className="bg-amber text-night inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-xs font-semibold"
        >
          Open coding room <ArrowRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function FeedbackCard({
  correct,
  label,
  answer,
  chosen,
  detail,
  mono = false,
}: {
  correct: boolean;
  label: string;
  answer: string;
  chosen?: string;
  detail?: string;
  mono?: boolean;
}) {
  return (
    <div className="bg-workshop p-5">
      <div className="flex items-center justify-between">
        <p className="text-dust text-[10px] font-semibold tracking-wide uppercase">
          {label}
        </p>
        {correct ? (
          <span className="text-sage flex items-center gap-1 text-[10px] font-semibold">
            <CheckCircle2 className="size-3.5" /> Correct
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-red-400">
            <X className="size-3.5" /> Not quite
          </span>
        )}
      </div>
      <p className={cn("mt-4 text-base font-semibold", mono && "font-mono")}>
        {answer}
      </p>
      {chosen && (
        <p className="text-dust mt-1 text-[11px]">
          You chose <span className="text-canvas">{chosen}</span>
        </p>
      )}
      {detail && (
        <p className="text-dust mt-3 text-[11px] leading-5">{detail}</p>
      )}
    </div>
  );
}

function PickStage({
  archetypes,
  recommendation,
  onStartRecommendation,
  archetypeId,
  setArchetypeId,
  difficulty,
  setDifficulty,
  busy,
  onStart,
}: {
  archetypes: ArchetypeOption[];
  recommendation: RecommendationView | null;
  onStartRecommendation: () => void;
  archetypeId: string;
  setArchetypeId: (value: string) => void;
  difficulty: Difficulty;
  setDifficulty: (value: Difficulty) => void;
  busy: boolean;
  onStart: () => void;
}) {
  return (
    <div className="border-iron/80 border-y">
      <div className="grid gap-7 py-7 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div>
          <div className="text-amber flex items-center gap-2">
            <Sparkles className="size-3.5" />
            <p className="font-mono text-[10px] tracking-wide uppercase">
              {recommendation ? "Recommended next" : "Mixed practice"}
            </p>
          </div>
          <h3 className="mt-3 text-2xl font-semibold tracking-[-.035em]">
            {recommendation?.archetypeName ?? "Let Zed choose the pattern"}
          </h3>
          <p className="text-canvas mt-2 max-w-2xl text-sm leading-6">
            {recommendation?.reason ??
              "You will see the problem before the pattern. This is the closest practice to recognizing it in an interview."}
          </p>
          <p className="text-dust mt-4 text-[11px] capitalize">
            {recommendation
              ? `${recommendation.difficulty} · about ${recommendation.estimatedMinutes} minutes`
              : `${difficulty} · generated and validated before it reaches you`}
          </p>
        </div>
        <button
          type="button"
          onClick={recommendation ? onStartRecommendation : onStart}
          disabled={busy}
          className="bg-amber text-night inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold disabled:opacity-40"
        >
          {busy ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Play className="size-4" />
          )}
          {busy ? "Preparing…" : "Start session"}
        </button>
      </div>

      <details className="group border-iron/70 border-t py-4">
        <summary className="text-canvas hover:text-linen flex list-none items-center justify-between text-xs font-semibold [&::-webkit-details-marker]:hidden">
          Choose a different focus
          <span className="text-dust font-mono text-[10px] group-open:hidden">
            Optional
          </span>
          <span className="text-dust hidden font-mono text-[10px] group-open:inline">
            Close
          </span>
        </summary>
        <div className="border-iron/60 mt-5 grid gap-5 border-t pt-5 sm:grid-cols-2">
          <label>
            <span className="text-dust text-[10px] font-semibold tracking-wide uppercase">
              Pattern
            </span>
            <Select
              value={archetypeId || "surprise-me"}
              onValueChange={(value) =>
                setArchetypeId(value === "surprise-me" ? "" : value)
              }
            >
              <SelectTrigger className="bg-raised mt-2 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="surprise-me">Surprise me</SelectItem>
                {archetypes.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <div>
            <p className="text-dust text-[10px] font-semibold tracking-wide uppercase">
              Difficulty
            </p>
            <div className="mt-2 flex gap-2">
              {DIFFICULTIES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setDifficulty(item)}
                  className={cn(
                    "min-h-11 flex-1 rounded-xl border px-3 text-xs font-semibold capitalize transition",
                    difficulty === item
                      ? "border-amber/40 bg-amber/10 text-linen"
                      : "border-iron text-canvas hover:text-linen",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onStart}
          disabled={busy}
          className="border-iron text-canvas hover:border-canvas/50 hover:text-linen mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 text-xs font-semibold disabled:opacity-40"
        >
          <Play className="size-3.5" /> Start this focus
        </button>
      </details>
    </div>
  );
}

function SolveStage({
  expanded,
  onToggleExpanded,
  problem,
  feedback,
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
  expanded: boolean;
  onToggleExpanded: () => void;
  problem: ClientProblem;
  feedback: GateFeedback | null;
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
  // Escape belongs with the overlay rather than with whatever rendered it: the
  // component that puts a full-screen surface up is the one that has to be able
  // to take it down, and leaving the only exit as a small icon strands anyone
  // who does not spot it.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onToggleExpanded();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded, onToggleExpanded]);

  return (
    <div
      className={cn(
        expanded
          ? // Fixed rather than a wider grid: the competency sidebar lives on
            // the page outside this component, and while solving it is taking
            // room from the two panes that matter.
            // Stacked below xl, side by side above it. Explicit minmax rows
            // stop a long statement from squeezing the editor to nothing, and
            // each pane scrolls inside itself rather than the whole overlay.
            "bg-night fixed inset-0 z-50 grid grid-rows-[minmax(0,1fr)_minmax(0,1.15fr)] gap-3 overflow-hidden p-3 xl:grid-cols-[.82fr_1.18fr] xl:grid-rows-[minmax(0,1fr)]"
          : "grid gap-4 xl:grid-cols-[.78fr_1.22fr]",
      )}
    >
      <div
        className={cn(
          "roleward-card space-y-6 rounded-[22px] p-5",
          // Scrolls on its own so a long statement cannot push the editor down
          // the page, which is what made the editor three lines tall.
          expanded
            ? "min-h-0 overflow-y-auto"
            : "max-h-[32rem] overflow-y-auto",
        )}
      >
        <Statement problem={problem} feedback={feedback} />

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

      <div
        className={cn(
          "roleward-card flex flex-col overflow-hidden rounded-[22px]",
          expanded ? "min-h-0" : "min-h-[28rem]",
        )}
      >
        <div className="border-iron/70 flex min-h-12 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <Braces className="text-amber size-3.5" />
            <Select
              value={language}
              onValueChange={(value) => onLanguage(value as Language)}
            >
              <SelectTrigger
                aria-label="Language"
                className="hover:bg-linen/[0.04] min-h-8 w-auto max-w-48 border-transparent bg-transparent px-2.5 text-xs focus:shadow-none"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORDERED_LANGUAGES.map((item) => (
                  <SelectItem key={item} value={item} className="text-xs">
                    {LANGUAGE_LABELS[item]}
                    {isExecutable(item) ? "" : " (editor only)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sage hidden items-center gap-1.5 text-[10px] sm:inline-flex">
              <span className="bg-sage size-1.5 rounded-full" /> Smart indent
            </span>
            <span className="text-dust font-mono text-[10px]">
              {code.split("\n").length} lines
            </span>
            <button
              type="button"
              onClick={onToggleExpanded}
              aria-label={expanded ? "Exit full screen" : "Expand editor"}
              title={
                expanded ? "Exit full screen (Esc)" : "Expand to full screen"
              }
              className="text-dust hover:text-canvas"
            >
              {expanded ? (
                <Minimize2 className="size-3.5" />
              ) : (
                <Maximize2 className="size-3.5" />
              )}
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 bg-[#111318] shadow-[inset_0_1px_12px_rgba(0,0,0,.25)]">
          <textarea
            value={code}
            onChange={(event) => onCode(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== "Tab") return;
              event.preventDefault();
              const target = event.currentTarget;
              const selection = {
                start: target.selectionStart,
                end: target.selectionEnd,
              };
              const edit =
                event.key === "Enter"
                  ? applySmartEnter(code, selection, language)
                  : applyTab(code, selection, event.shiftKey);
              onCode(edit.value);
              requestAnimationFrame(() => {
                target.selectionStart = edit.selection.start;
                target.selectionEnd = edit.selection.end;
              });
            }}
            spellCheck={false}
            aria-label="Solution"
            className="text-linen selection:bg-amber/30 h-full w-full resize-none bg-transparent p-5 font-mono text-[13px] leading-6 outline-none"
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
            Finish &amp; see coaching
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
            className="bg-amber text-night inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold disabled:opacity-40"
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
        <div className="roleward-card rounded-[22px] p-5">
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
        <div className="roleward-card rounded-[22px] p-5">
          <p className="section-label">What this session measured</p>
          <p className="text-dust mt-1 text-xs">
            Only the skills this problem actually tested. Zed cannot hear you
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
                      item.score >= 7 ? "bg-sage" : "bg-amber",
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
                <ArrowRight className="text-amber size-3.5" />
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
        <div className="roleward-card rounded-[22px] p-5">
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
        className="bg-amber text-night inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-xs font-semibold"
      >
        <RotateCcw className="size-3.5" />
        Practise another
      </button>
    </div>
  );
}
