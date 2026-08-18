import { describe, expect, it } from "vitest";
import {
  matchesExpected,
  reconcileOutcomes,
  redactForClient,
  summarizeVerdict,
  type ExecutionResult,
  type TestOutcome,
} from "./port";

const outcome = (
  patch: Partial<TestOutcome> & { index: number },
): TestOutcome => ({ passed: true, timeMs: 1, ...patch }) as TestOutcome;

describe("matchesExpected", () => {
  it("compares nested structures by value", () => {
    expect(matchesExpected([1, [2, 3]], [1, [2, 3]])).toBe(true);
    expect(matchesExpected({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
    expect(matchesExpected([1, 2], [2, 1])).toBe(false);
  });
  it("tolerates float drift but not type coercion", () => {
    expect(matchesExpected(0.1 + 0.2, 0.3)).toBe(true);
    expect(matchesExpected(1, "1")).toBe(false);
  });
});

describe("summarizeVerdict", () => {
  it("reports the first failure kind, preferring limits over generic errors", () => {
    expect(summarizeVerdict([outcome({ index: 0 })])).toBe("accepted");
    expect(summarizeVerdict([outcome({ index: 0, passed: false })])).toBe(
      "wrong_answer",
    );
    expect(
      summarizeVerdict([
        outcome({ index: 0, passed: false, error: "__TIMEOUT__ 4000ms" }),
      ]),
    ).toBe("time_limit");
    expect(
      summarizeVerdict([
        outcome({ index: 0, passed: false, error: "IndexError" }),
      ]),
    ).toBe("runtime_error");
  });
  it("treats an empty run as a judge failure rather than a pass", () => {
    expect(summarizeVerdict([])).toBe("internal_error");
  });
});

describe("reconcileOutcomes", () => {
  const tests = [
    { input: [1, 2], expected: 3 },
    { input: [5, 5], expected: 10 },
  ];

  it("accepts only outcomes whose returned value matches the server's expectation", () => {
    const reconciled = reconcileOutcomes(tests, [
      outcome({ index: 0, actual: 3 }),
      outcome({ index: 1, actual: 11 }),
    ]);
    expect(reconciled.map((item) => item.passed)).toEqual([true, false]);
  });

  it("fails an outcome that claims success without reporting a value", () => {
    // A submission that forges the judge's result channel cannot also produce
    // the hidden expectations, so a bare `passed` is never taken at its word.
    expect(reconcileOutcomes(tests, [outcome({ index: 0 })])[0]?.passed).toBe(
      false,
    );
  });

  it("fails an outcome that errored even if it reported a matching value", () => {
    expect(
      reconcileOutcomes(tests, [
        outcome({ index: 0, actual: 3, error: "__TIMEOUT__ 4000ms" }),
      ])[0]?.passed,
    ).toBe(false);
  });

  it("fails an outcome indexed outside the tests that were sent", () => {
    expect(
      reconcileOutcomes(tests, [outcome({ index: 9, actual: 3 })])[0]?.passed,
    ).toBe(false);
  });
});

describe("redactForClient", () => {
  it("strips values and stdout from hidden tests but keeps pass/fail", () => {
    const result: ExecutionResult = {
      verdict: "wrong_answer",
      passed: 1,
      total: 2,
      durationMs: 10,
      outcomes: [
        outcome({ index: 0, actual: [0, 1], stdout: "debug" }),
        outcome({
          index: 1,
          passed: false,
          actual: [9, 9],
          stdout: "secret",
          error: "boom",
        }),
      ],
    };
    const redacted = redactForClient(result, 1);
    expect(redacted.outcomes[0]?.actual).toEqual([0, 1]);
    expect(redacted.outcomes[1]).toEqual({
      index: 1,
      passed: false,
      timeMs: 1,
    });
  });
});
