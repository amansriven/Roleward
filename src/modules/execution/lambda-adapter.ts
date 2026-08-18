import "server-only";

import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { awsRegion } from "@/modules/aws/config";
import {
  ExecutionUnavailableError,
  isExecutable,
  reconcileOutcomes,
  resolveLimits,
  summarizeVerdict,
  type DifferentialRequest,
  type DifferentialResult,
  type ExecutionAdapter,
  type ExecutionRequest,
  type ExecutionResult,
  type OutputsRequest,
  type OutputsResult,
  type TestOutcome,
} from "./port";

export const judgeFunctionName = process.env.AWS_JUDGE_FUNCTION || "";
export const executionConfigured = Boolean(judgeFunctionName);

const client = new LambdaClient({ region: awsRegion });

/** Judge responses are data from a subprocess; nothing here is trusted shape. */
interface JudgePayload {
  verdict?: string;
  outcomes?: TestOutcome[];
  message?: string;
  durationMs?: number;
  agreed?: boolean;
  trials?: number;
  mismatches?: DifferentialResult["mismatches"];
  error?: string;
  results?: OutputsResult["results"];
  compileError?: string;
}

function classify(error: unknown): never {
  const name = error instanceof Error ? error.name : "";
  if (name === "ResourceNotFoundException")
    throw new ExecutionUnavailableError(
      "unconfigured",
      "The judge function was not found in this region.",
    );
  if (
    name === "AccessDeniedException" ||
    name === "AccessDeniedError" ||
    name === "UnrecognizedClientException" ||
    name === "InvalidSignatureException" ||
    name === "CredentialsProviderError"
  )
    throw new ExecutionUnavailableError(
      "access_denied",
      "AWS rejected the judge invocation.",
    );
  throw new ExecutionUnavailableError(
    "judge_error",
    error instanceof Error ? error.message : "The judge failed.",
  );
}

async function invoke(payload: unknown): Promise<JudgePayload> {
  if (!executionConfigured) throw new ExecutionUnavailableError("unconfigured");
  let response;
  try {
    response = await client.send(
      new InvokeCommand({
        FunctionName: judgeFunctionName,
        InvocationType: "RequestResponse",
        Payload: Buffer.from(JSON.stringify(payload)),
      }),
    );
  } catch (error) {
    classify(error);
  }
  // A handler crash surfaces as FunctionError with the trace in the payload.
  const raw = response.Payload
    ? Buffer.from(response.Payload).toString("utf8")
    : "";
  if (response.FunctionError)
    throw new ExecutionUnavailableError(
      "judge_error",
      `The judge raised ${response.FunctionError}.`,
    );
  try {
    return JSON.parse(raw) as JudgePayload;
  } catch {
    throw new ExecutionUnavailableError(
      "judge_error",
      "The judge returned a malformed response.",
    );
  }
}

export const lambdaExecutionAdapter: ExecutionAdapter = {
  configured: executionConfigured,

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    if (!isExecutable(request.language))
      throw new ExecutionUnavailableError(
        "unsupported_language",
        `${request.language} cannot be run by the judge yet.`,
      );
    const limits = resolveLimits(request.limits);
    const payload = await invoke({
      mode: "tests",
      code: request.code,
      entrypoint: request.entrypoint,
      tests: request.tests,
      timeLimitMs: limits.timeLimitMs,
      memoryLimitMb: limits.memoryLimitMb,
    });

    if (payload.verdict === "compile_error" || payload.verdict === "time_limit")
      return {
        verdict: payload.verdict,
        outcomes: [],
        passed: 0,
        total: request.tests.length,
        message: payload.message,
        durationMs: payload.durationMs ?? 0,
      };
    if (payload.verdict === "internal_error")
      throw new ExecutionUnavailableError(
        "judge_error",
        payload.message ?? "The judge produced no result.",
      );

    const outcomes = reconcileOutcomes(request.tests, payload.outcomes ?? []);
    return {
      verdict: summarizeVerdict(outcomes),
      outcomes,
      passed: outcomes.filter((item) => item.passed).length,
      total: request.tests.length,
      message: payload.message,
      durationMs: payload.durationMs ?? 0,
    };
  },

  async deriveOutputs(request: OutputsRequest): Promise<OutputsResult> {
    if (!isExecutable(request.language))
      throw new ExecutionUnavailableError("unsupported_language");
    const limits = resolveLimits(request.limits);
    const payload = await invoke({
      mode: "outputs",
      code: request.code,
      entrypoint: request.entrypoint,
      inputs: request.inputs,
      timeLimitMs: limits.timeLimitMs,
      memoryLimitMb: limits.memoryLimitMb,
    });
    return {
      results: payload.results ?? [],
      compileError: payload.compileError ?? payload.message,
    };
  },

  async differential(
    request: DifferentialRequest,
  ): Promise<DifferentialResult> {
    if (!isExecutable(request.language))
      throw new ExecutionUnavailableError("unsupported_language");
    const limits = resolveLimits(request.limits);
    const payload = await invoke({
      mode: "differential",
      canonicalCode: request.canonicalCode,
      bruteForceCode: request.bruteForceCode,
      generatorCode: request.generatorCode,
      entrypoint: request.entrypoint,
      trials: request.trials,
      timeLimitMs: limits.timeLimitMs,
      memoryLimitMb: limits.memoryLimitMb,
    });
    return {
      agreed: Boolean(payload.agreed),
      trials: payload.trials ?? 0,
      mismatches: payload.mismatches ?? [],
      error: payload.error,
    };
  },
};
