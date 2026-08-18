/**
 * Provider-agnostic code execution contract.
 *
 * Nothing above this file knows whether code runs on Lambda, a self-hosted
 * judge, or a local stub. That boundary is deliberate: the storage layer used
 * the same shape to move from localStorage to DynamoDB without touching the UI.
 */

export const LANGUAGES = [
  "python",
  "javascript",
  "typescript",
  "java",
  "cpp",
  "go",
  "csharp",
  "kotlin",
  "swift",
  "rust",
] as const;
export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<Language, string> = {
  python: "Python",
  javascript: "JavaScript",
  typescript: "TypeScript",
  java: "Java",
  cpp: "C++",
  go: "Go",
  csharp: "C#",
  kotlin: "Kotlin",
  swift: "Swift",
  rust: "Rust",
};

/** Languages the judge can actually run today. The rest are editor-only. */
export const EXECUTABLE_LANGUAGES: Language[] = ["python"];
export function isExecutable(language: Language) {
  return EXECUTABLE_LANGUAGES.includes(language);
}

export type Verdict =
  | "accepted"
  | "wrong_answer"
  | "runtime_error"
  | "time_limit"
  | "memory_limit"
  | "compile_error"
  | "internal_error";

export const VERDICT_LABELS: Record<Verdict, string> = {
  accepted: "Accepted",
  wrong_answer: "Wrong answer",
  runtime_error: "Runtime error",
  time_limit: "Time limit exceeded",
  memory_limit: "Memory limit exceeded",
  compile_error: "Compile error",
  internal_error: "Judge error",
};

export interface TestCase {
  /** Positional arguments applied to the entrypoint, in order. */
  input: unknown[];
  expected: unknown;
}

export interface ExecutionLimits {
  timeLimitMs: number;
  memoryLimitMb: number;
}

export const DEFAULT_LIMITS: ExecutionLimits = {
  timeLimitMs: 4000,
  memoryLimitMb: 256,
};

export interface ExecutionRequest {
  language: Language;
  /** Untrusted candidate source. Never evaluated in the web server process. */
  code: string;
  entrypoint: string;
  tests: TestCase[];
  limits?: Partial<ExecutionLimits>;
}

export interface TestOutcome {
  index: number;
  passed: boolean;
  /** Omitted for hidden tests before the result is returned to the browser. */
  actual?: unknown;
  stdout?: string;
  error?: string;
  timeMs: number;
}

export interface ExecutionResult {
  verdict: Verdict;
  outcomes: TestOutcome[];
  passed: number;
  total: number;
  /** Compile/runtime message worth showing verbatim, already truncated. */
  message?: string;
  durationMs: number;
}

/**
 * Differential validation: two independent solutions must agree on randomized
 * inputs. Catches the failure mode where a model writes a wrong solution and a
 * matching wrong set of expectations.
 */
export interface DifferentialRequest {
  language: Language;
  canonicalCode: string;
  bruteForceCode: string;
  /** Python source defining `generate_input(seed)` returning an argument list. */
  generatorCode: string;
  entrypoint: string;
  trials: number;
  limits?: Partial<ExecutionLimits>;
}

export interface DifferentialMismatch {
  seed: number;
  input: unknown[];
  canonical: unknown;
  bruteForce: unknown;
}

export interface DifferentialResult {
  agreed: boolean;
  trials: number;
  mismatches: DifferentialMismatch[];
  error?: string;
}

/**
 * Runs a solution over inputs and reports what it returned.
 *
 * Expected outputs are derived this way rather than authored: a model can write
 * a correct function and still mispredict its own return values.
 */
export interface OutputsRequest {
  language: Language;
  code: string;
  entrypoint: string;
  inputs: unknown[][];
  limits?: Partial<ExecutionLimits>;
}

export interface DerivedOutput {
  index: number;
  value?: unknown;
  error?: string;
  timeMs: number;
}

export interface OutputsResult {
  results: DerivedOutput[];
  compileError?: string;
}

export class ExecutionUnavailableError extends Error {
  constructor(
    public code:
      "unconfigured" | "unsupported_language" | "access_denied" | "judge_error",
    message?: string,
  ) {
    super(message ?? code);
    this.name = "ExecutionUnavailableError";
  }
}

export interface ExecutionAdapter {
  readonly configured: boolean;
  execute(request: ExecutionRequest): Promise<ExecutionResult>;
  differential(request: DifferentialRequest): Promise<DifferentialResult>;
  deriveOutputs(request: OutputsRequest): Promise<OutputsResult>;
}

export function resolveLimits(limits?: Partial<ExecutionLimits>) {
  return { ...DEFAULT_LIMITS, ...limits };
}

/** Structural comparison that treats 1 and 1.0 alike but 1 and "1" as distinct. */
export function matchesExpected(actual: unknown, expected: unknown): boolean {
  if (Object.is(actual, expected)) return true;
  if (typeof actual === "number" && typeof expected === "number")
    return Math.abs(actual - expected) < 1e-9;
  if (Array.isArray(actual) && Array.isArray(expected))
    return (
      actual.length === expected.length &&
      actual.every((item, index) => matchesExpected(item, expected[index]))
    );
  if (
    actual &&
    expected &&
    typeof actual === "object" &&
    typeof expected === "object"
  ) {
    const left = actual as Record<string, unknown>;
    const right = expected as Record<string, unknown>;
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every((key, index) => key === rightKeys[index]) &&
      leftKeys.every((key) => matchesExpected(left[key], right[key]))
    );
  }
  return false;
}

/** Collapses per-test outcomes into the single verdict shown to the candidate. */
export function summarizeVerdict(outcomes: TestOutcome[]): Verdict {
  if (!outcomes.length) return "internal_error";
  const failure = outcomes.find((item) => !item.passed);
  if (!failure) return "accepted";
  if (failure.error?.startsWith("__TIMEOUT__")) return "time_limit";
  if (failure.error?.startsWith("__MEMORY__")) return "memory_limit";
  if (failure.error) return "runtime_error";
  return "wrong_answer";
}

/**
 * Re-derives every verdict from the expectations the server holds.
 *
 * The judge's `passed` flag is not evidence. Submitted code is exec'd in the
 * same process as the runner and can forge the result channel, so a claim of
 * success only counts once the server has compared the returned value against
 * an expectation the submission never saw. An outcome carrying no `actual`
 * therefore fails, however it was reported.
 */
export function reconcileOutcomes(
  tests: TestCase[],
  reported: TestOutcome[],
): TestOutcome[] {
  return reported.map((outcome) => {
    const test = tests[outcome.index];
    const passed =
      !outcome.error &&
      test !== undefined &&
      "actual" in outcome &&
      matchesExpected(outcome.actual, test.expected);
    return { ...outcome, passed };
  });
}

/** Hidden expectations must never cross the network to the browser. */
export function redactForClient(
  result: ExecutionResult,
  visibleCount: number,
): ExecutionResult {
  return {
    ...result,
    outcomes: result.outcomes.map((outcome) =>
      outcome.index < visibleCount
        ? outcome
        : {
            index: outcome.index,
            passed: outcome.passed,
            timeMs: outcome.timeMs,
          },
    ),
  };
}
