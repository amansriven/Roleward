# Code execution setup (AWS Lambda judge)

Guru generates coding problems with a model and then proves them correct by
running code. That means an execution service. This document covers creating it.

Infrastructure names stay in the existing `sweetplus-*` family. Renaming AWS
resources buys nothing user-visible and risks the two things that cannot be
recovered: accounts and uploaded files.

**Region: `us-east-2`** — the same region as the DynamoDB table and S3 bucket.
Check the region selector in the AWS console header before starting.

---

## 1. Create the execution role

The judge needs a role, but almost no permissions — it never touches DynamoDB or
S3. It only needs to write its own logs.

1. Open **IAM → Roles → Create role**
2. Trusted entity type: **AWS service**
3. Use case: **Lambda** → Next
4. Attach two AWS managed policies:
   - **AWSLambdaBasicExecutionRole** — write its own logs
   - **AWSLambdaVPCAccessExecutionRole** — attach the network interfaces the
     closed-egress VPC below requires
5. Role name:

```text
sweetplus-judge-role
```

6. Create the role, then open it and copy the **ARN** from the top of the page.
   It looks like `arn:aws:iam::445457039000:role/sweetplus-judge-role`.

Do not attach anything else. If the judge is ever compromised, its blast radius
should be a log stream.

---

## 2. Deploy the function

The handler is code you will iterate on, so it is deployed by script rather than
by uploading zips through the console.

From the repository root, with the role ARN from step 1:

```bash
JUDGE_ROLE_ARN=arn:aws:iam::445457039000:role/sweetplus-judge-role ./scripts/deploy-judge.sh
```

This creates `sweetplus-judge-python` (Python 3.12, 512 MB, 30 s timeout) inside
the closed-egress VPC listed under Security notes. Those subnet and security
group ids are defaults in the script, so a function recreated from scratch keeps
its isolation instead of quietly coming back with open egress. Every
later run updates the code in place — no role ARN needed after the first deploy:

```bash
./scripts/deploy-judge.sh
```

If the AWS CLI is not installed or not signed in:

```bash
aws configure
```

Use the same access key already in your `.env`, and set the default region to
`us-east-2`.

---

## 3. Smoke-test the judge

The deploy script prints this command. It should return an outcome with
`"passed": true`:

```bash
aws lambda invoke --function-name sweetplus-judge-python --region us-east-2 \
  --cli-binary-format raw-in-base64-out \
  --payload '{"mode":"tests","entrypoint":"add","timeLimitMs":2000,"code":"def add(a,b):\n    return a+b","tests":[{"input":[1,2],"expected":3}]}' \
  /dev/stdout
```

---

## 4. Allow the app to invoke it

The app authenticates as the existing `sweetplus-vercel` IAM user, which cannot
call Lambda yet.

1. Open **IAM → Policies → SweetPlusVercelPersistence → Edit**
2. Add this third statement inside the existing `Statement` array:

```json
{
  "Sid": "InvokeJudge",
  "Effect": "Allow",
  "Action": ["lambda:InvokeFunction"],
  "Resource": "arn:aws:lambda:us-east-2:445457039000:function:sweetplus-judge-python"
}
```

3. Save as the new default version.

The complete policy should now have three statements: `WorkspaceItems`,
`PrivateUploads`, and `InvokeJudge`.

---

## 5. Add the environment variable

Local `.env` and **Vercel → Settings → Environment Variables** (Production,
Preview, Development):

```env
AWS_JUDGE_FUNCTION=sweetplus-judge-python
```

Then redeploy Vercel so the build picks it up.

Guru also needs `OPENAI_API_KEY`, which you already have, and a secret for the
pool warmer below:

```env
CRON_SECRET=
```

Any long random string. Vercel presents it to scheduled invocations as a bearer
token; `/api/guru/pool/warm` returns `401` to everything else, and refuses to
run at all when the variable is unset rather than falling open.

---

## 5a. The warm pool

Generating one validated problem takes 11 to 28 seconds — an OpenAI call plus
two judge round trips, retried up to three times. That cannot sit behind a
click, so problems are generated ahead of the request into a pool partitioned by
archetype and difficulty.

Problems are not user-specific, so one pool serves everyone. A pooled problem is
lent rather than consumed: it stays in the cell after being served, and a
per-user set of seen ids is what stops anyone being given the same problem
twice. `/api/guru/problem` claims an unseen one, copies it into the caller's
namespace so `/api/guru/run` can find its tests, and tops the cell up
after the response via `after`.

Two things fill the pool:

| Trigger                   | What it does                                         |
| ------------------------- | ---------------------------------------------------- |
| `vercel.json` hourly cron | Fills the shallowest cell toward its target          |
| A served request          | Tops up the cell it just drew from, after responding |

A single cell can be filled directly, which is how a newly added archetype gets
proven without waiting for the rotation to reach it:

```bash
curl -H "authorization: Bearer $CRON_SECRET" \
  "$APP_URL/api/guru/pool/warm?archetype=graph-bfs&difficulty=medium"
```

Refills take a DynamoDB lock per cell, so a burst against a cold cell does not
pay for the same problems several times over. A cell with nothing unseen left
still generates inline, so an empty pool means the old latency, not an error.

Pool size constants live in `src/modules/guru/pool-policy.ts`.

---

## 6. Verify end to end

With a signed-in session:

```bash
curl -sS https://sweetplus.vercel.app/api/guru/problem \
  -X POST -H 'content-type: application/json' \
  -d '{"archetypeId":"sliding-window","difficulty":"medium"}'
```

Unauthenticated this returns `401`, which confirms the route is live. Inside the
app, a successful call returns a problem whose two independent solutions agreed
across 60 randomized inputs.

Failure codes returned by these routes:

| `code`                 | Meaning                                                         |
| ---------------------- | --------------------------------------------------------------- |
| `unconfigured`         | `AWS_JUDGE_FUNCTION`, `OPENAI_API_KEY`, or the table is missing |
| `access_denied`        | Step 4 was skipped or the ARN does not match                    |
| `unsupported_language` | Editor-only language submitted to the judge                     |
| `validation_failed`    | Three generations in a row failed validation                    |
| `judge_error`          | The function ran but returned nothing usable                    |

---

## Security notes

**Egress is closed.** The judge runs in a VPC with no internet gateway, no NAT
gateway, and DNS resolution disabled, so submitted code has no route off the
host and cannot resolve a name to try.

| Resource         | Id                         |
| ---------------- | -------------------------- |
| VPC              | `vpc-0720c9fc87b19d5c5`    |
| Private subnet A | `subnet-005cb8222b1126b8d` |
| Private subnet B | `subnet-0be062dc6c7808a32` |
| Security group   | `sg-0716d58b992a8067b`     |

Verified after the change: a raw-IP `socket.create_connection` times out,
`socket.gethostbyname` hangs, the EC2 metadata endpoint is unreachable, and
ordinary execution and differential runs are unaffected. Cold-start cost of VPC
attachment measured at roughly 97 ms of init.

CloudWatch logging still works — Lambda delivers logs through the service, not
through the function's VPC interface, so no NAT is required for it.

If the judge ever needs an AWS API (it does not today), add a VPC endpoint for
that service rather than a NAT gateway. A NAT gateway would restore general
internet access and reopen this hole, besides costing about $32 a month.

**Isolation** is Lambda's own per-invocation Firecracker microVM. The limits in
the handler exist to return a useful verdict — time limit versus wrong answer —
not to contain a determined attacker. The microVM boundary does that.

**Verdicts are re-derived by the server.** Submitted code is `exec`'d in the
same process as the runner, so nothing it reports about itself is evidence.
`reconcileOutcomes` in `src/modules/execution/port.ts` recomputes every pass or
fail from the expectations the server holds, and an outcome that claims success
without returning a value fails. The runner also tags its result line with a
per-invocation token generated before any submitted code runs, so a module-level
`print` cannot impersonate the result channel.

**Tests are all visible; the solutions are not.** Problems were once split into
public and hidden tests so a candidate could not hardcode past the judge. That
protects a score with an external stakeholder, and here there is none — the only
person a candidate can cheat is themselves, and the cost was a failing test they
were not allowed to look at. What still never crosses to the browser is the
canonical solution, the brute force, the input generator, and the archetype id,
which is the practice gate's answer.

Verdicts do not depend on the tests being secret. `reconcileOutcomes` recomputes
every pass from the expectations the server holds, so a forged judge response
still fails.

---

## Adding languages later

Only Python runs today; the other nine render editor stubs but are rejected by
`/api/guru/run` with `unsupported_language`.

Adding a compiled language means a container-image Lambda with the toolchain
baked in, then extending `EXECUTABLE_LANGUAGES` in
`src/modules/execution/port.ts`. Nothing above the execution port changes —
that boundary exists so the provider and language set can move independently.
