"""
Python judge for Backstage coding practice.

Untrusted candidate code never runs in this process. Every batch is handed to a
short-lived subprocess so that a crash, an infinite loop, or an allocation storm
takes down only the child. Lambda's per-invocation Firecracker microVM is the
real security boundary; the limits here exist to return a useful verdict rather
than to contain a determined attacker.

Event shapes
------------
{"mode": "tests", "code", "entrypoint", "tests": [{"input": [...], "expected": x}],
 "timeLimitMs", "memoryLimitMb"}

{"mode": "differential", "canonicalCode", "bruteForceCode", "generatorCode",
 "entrypoint", "trials", "timeLimitMs", "memoryLimitMb"}
"""

import json
import os
import subprocess
import sys
import time
import uuid

RUNNER_PATH = "/tmp/runner.py"
MAX_MESSAGE = 2000

RUNNER_SOURCE = r'''
import json, sys, signal, resource, traceback, io, contextlib

class _Timeout(Exception):
    pass

def _on_alarm(signum, frame):
    raise _Timeout()

def _apply_limits(memory_mb):
    limit = memory_mb * 1024 * 1024
    try:
        resource.setrlimit(resource.RLIMIT_AS, (limit, limit))
    except (ValueError, OSError):
        pass
    sys.setrecursionlimit(20000)

def _normalize(value):
    """JSON-safe, and collapses the tuple/list distinction Python cares about."""
    if isinstance(value, tuple):
        return [_normalize(item) for item in value]
    if isinstance(value, list):
        return [_normalize(item) for item in value]
    if isinstance(value, (set, frozenset)):
        return sorted(_normalize(item) for item in value)
    if isinstance(value, dict):
        return {str(k): _normalize(v) for k, v in value.items()}
    if isinstance(value, complex):
        return [value.real, value.imag]
    return value

def _equal(a, b):
    if isinstance(a, bool) or isinstance(b, bool):
        return a is b if isinstance(a, bool) and isinstance(b, bool) else a == b
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return abs(a - b) < 1e-9
    if isinstance(a, list) and isinstance(b, list):
        return len(a) == len(b) and all(_equal(x, y) for x, y in zip(a, b))
    if isinstance(a, dict) and isinstance(b, dict):
        return a.keys() == b.keys() and all(_equal(a[k], b[k]) for k in a)
    return a == b

def _load(source, label):
    namespace = {"__name__": "__solution__"}
    try:
        exec(compile(source, label, "exec"), namespace)
    except Exception:
        return None, traceback.format_exc(limit=3)
    return namespace, None

def _call(fn, args, time_limit_ms):
    """Runs one call under a wall-clock alarm. Returns (value, error, ms)."""
    signal.setitimer(signal.ITIMER_REAL, time_limit_ms / 1000.0)
    buffer = io.StringIO()
    started = __import__("time").perf_counter()
    try:
        with contextlib.redirect_stdout(buffer):
            value = fn(*args)
        return _normalize(value), None, (__import__("time").perf_counter() - started) * 1000, buffer.getvalue()
    except _Timeout:
        return None, "__TIMEOUT__ exceeded %dms" % time_limit_ms, time_limit_ms, buffer.getvalue()
    except MemoryError:
        return None, "__MEMORY__ allocation limit reached", (__import__("time").perf_counter() - started) * 1000, buffer.getvalue()
    except RecursionError:
        return None, "RecursionError: maximum recursion depth exceeded", (__import__("time").perf_counter() - started) * 1000, buffer.getvalue()
    except Exception:
        return None, traceback.format_exc(limit=3), (__import__("time").perf_counter() - started) * 1000, buffer.getvalue()
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)

def _resolve(namespace, entrypoint):
    fn = namespace.get(entrypoint)
    if callable(fn):
        return fn, None
    # Tolerate class-based submissions (the LeetCode `Solution` habit).
    holder = namespace.get("Solution")
    if holder is not None:
        try:
            method = getattr(holder(), entrypoint, None)
        except Exception:
            method = None
        if callable(method):
            return method, None
    return None, "No callable named '%s' was defined." % entrypoint

def run_tests(payload):
    _apply_limits(payload.get("memoryLimitMb", 256))
    signal.signal(signal.SIGALRM, _on_alarm)
    namespace, error = _load(payload["code"], "solution.py")
    if error:
        return {"compileError": error[:2000], "outcomes": []}
    fn, error = _resolve(namespace, payload["entrypoint"])
    if error:
        return {"compileError": error, "outcomes": []}

    limit = payload.get("timeLimitMs", 4000)
    outcomes = []
    for index, case in enumerate(payload["tests"]):
        value, error, ms, stdout = _call(fn, case["input"], limit)
        expected = _normalize(case["expected"])
        passed = error is None and _equal(value, expected)
        # `actual` is always reported, including on a pass: the caller re-checks
        # every outcome against expectations this process never received in a
        # trustworthy way, and an outcome with no value is treated as a failure.
        outcome = {
            "index": index,
            "passed": passed,
            "actual": value,
            "timeMs": round(ms, 3),
        }
        if not passed and error:
            outcome["error"] = error[:1000]
        if stdout:
            outcome["stdout"] = stdout[:1000]
        outcomes.append(outcome)
        # A timeout means the remaining cases will almost certainly time out too.
        if error and error.startswith("__TIMEOUT__"):
            break
    return {"outcomes": outcomes}

def run_outputs(payload):
    """Executes the entrypoint over inputs and returns what it produced.

    Used to derive expected outputs from a solution that has already survived
    differential testing, rather than trusting a model to predict its own
    function's return values.
    """
    _apply_limits(payload.get("memoryLimitMb", 256))
    signal.signal(signal.SIGALRM, _on_alarm)
    namespace, error = _load(payload["code"], "solution.py")
    if error:
        return {"compileError": error[:2000], "results": []}
    fn, error = _resolve(namespace, payload["entrypoint"])
    if error:
        return {"compileError": error, "results": []}

    limit = payload.get("timeLimitMs", 4000)
    results = []
    for index, args in enumerate(payload["inputs"]):
        value, error, ms, _ = _call(fn, args, limit)
        entry = {"index": index, "timeMs": round(ms, 3)}
        if error:
            entry["error"] = error[:600]
        else:
            entry["value"] = value
        results.append(entry)
    return {"results": results}

def run_differential(payload):
    _apply_limits(payload.get("memoryLimitMb", 256))
    signal.signal(signal.SIGALRM, _on_alarm)
    limit = payload.get("timeLimitMs", 4000)

    generator_ns, error = _load(payload["generatorCode"], "generator.py")
    if error:
        return {"agreed": False, "trials": 0, "mismatches": [], "error": "generator: " + error[:800]}
    canonical_ns, error = _load(payload["canonicalCode"], "canonical.py")
    if error:
        return {"agreed": False, "trials": 0, "mismatches": [], "error": "canonical: " + error[:800]}
    brute_ns, error = _load(payload["bruteForceCode"], "brute.py")
    if error:
        return {"agreed": False, "trials": 0, "mismatches": [], "error": "brute force: " + error[:800]}

    generate = generator_ns.get("generate_input")
    if not callable(generate):
        return {"agreed": False, "trials": 0, "mismatches": [], "error": "generate_input was not defined"}
    canonical, error = _resolve(canonical_ns, payload["entrypoint"])
    if error:
        return {"agreed": False, "trials": 0, "mismatches": [], "error": "canonical: " + error}
    brute, error = _resolve(brute_ns, payload["entrypoint"])
    if error:
        return {"agreed": False, "trials": 0, "mismatches": [], "error": "brute force: " + error}

    mismatches = []
    completed = 0
    for seed in range(payload.get("trials", 40)):
        args, error, _, _ = _call(generate, [seed], limit)
        if error or not isinstance(args, list):
            return {
                "agreed": False,
                "trials": completed,
                "mismatches": mismatches,
                "error": "generate_input(%d) failed: %s" % (seed, (error or "did not return a list")[:400]),
            }
        left, left_error, _, _ = _call(canonical, args, limit)
        right, right_error, _, _ = _call(brute, args, limit)
        completed += 1
        if left_error or right_error:
            return {
                "agreed": False,
                "trials": completed,
                "mismatches": mismatches,
                "error": "seed %d raised: %s" % (seed, (left_error or right_error)[:400]),
            }
        if not _equal(left, right):
            mismatches.append({"seed": seed, "input": args, "canonical": left, "bruteForce": right})
            if len(mismatches) >= 3:
                break
    return {"agreed": not mismatches, "trials": completed, "mismatches": mismatches}

def main():
    payload = json.loads(sys.stdin.read())
    # Read before any submitted code runs, so an exec'd module cannot recover
    # the marker and print a result of its own choosing.
    marker = "\n__RESULT__" + str(payload.pop("resultToken", ""))
    mode = payload.get("mode", "tests")
    if mode == "differential":
        result = run_differential(payload)
    elif mode == "outputs":
        result = run_outputs(payload)
    else:
        result = run_tests(payload)
    sys.stdout.write(marker + json.dumps(result))

main()
'''


def _ensure_runner():
    """/tmp persists across warm invocations, so only write when missing."""
    if not os.path.exists(RUNNER_PATH):
        with open(RUNNER_PATH, "w", encoding="utf-8") as handle:
            handle.write(RUNNER_SOURCE)


def _parse(stdout, token):
    marker = "__RESULT__" + token
    at = stdout.rfind(marker)
    if at == -1:
        return None
    return json.loads(stdout[at + len(marker) :])


def lambda_handler(event, _context):
    started = time.perf_counter()
    _ensure_runner()

    token = uuid.uuid4().hex
    time_limit_ms = int(event.get("timeLimitMs", 4000))
    mode = event.get("mode", "tests")
    tests = event.get("tests") or []
    inputs = event.get("inputs") or []
    trials = int(event.get("trials", 40))
    # Outer bound: every case can burn its full slice before the batch is cut off.
    if mode == "differential":
        slices = trials * 3
    elif mode == "outputs":
        slices = len(inputs)
    else:
        slices = len(tests)
    outer_seconds = min(60.0, (time_limit_ms / 1000.0) * max(1, slices) + 3.0)

    try:
        completed = subprocess.run(
            [sys.executable, RUNNER_PATH],
            input=json.dumps({**event, "resultToken": token}),
            capture_output=True,
            text=True,
            timeout=outer_seconds,
            cwd="/tmp",
            env={"PATH": os.environ.get("PATH", ""), "HOME": "/tmp", "PYTHONHASHSEED": "0"},
        )
    except subprocess.TimeoutExpired:
        return {
            "verdict": "time_limit",
            "outcomes": [],
            "message": "The batch exceeded %.0fs of total run time." % outer_seconds,
            "durationMs": round((time.perf_counter() - started) * 1000, 3),
        }

    parsed = _parse(completed.stdout or "", token)
    duration_ms = round((time.perf_counter() - started) * 1000, 3)

    if parsed is None:
        stderr = (completed.stderr or "").strip()[-MAX_MESSAGE:]
        return {
            "verdict": "internal_error",
            "outcomes": [],
            "message": stderr or "The judge produced no result.",
            "durationMs": duration_ms,
        }

    if mode in ("differential", "outputs"):
        if parsed.get("compileError"):
            return {
                "verdict": "compile_error",
                "message": parsed["compileError"][:MAX_MESSAGE],
                "results": [],
                "durationMs": duration_ms,
            }
        return {**parsed, "durationMs": duration_ms}

    if parsed.get("compileError"):
        return {
            "verdict": "compile_error",
            "outcomes": [],
            "message": parsed["compileError"][:MAX_MESSAGE],
            "durationMs": duration_ms,
        }

    return {"outcomes": parsed.get("outcomes", []), "durationMs": duration_ms}
