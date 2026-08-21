# Backstage — handoff notes

Interview-prep platform. Next.js 16 on Vercel (`sweetplus.vercel.app`), AWS in
`us-east-2`, auth via Cognito + Auth.js, persistence in one DynamoDB table.

The product, routes, feature modules, and UI now use the Backstage naming system:
Applications, Resume Kitchen, Zed, and Stage Fright.

Existing AWS resource IDs and the current Vercel hostname retain their original
physical names. They are deployment identifiers, not product copy. Do not
recreate Cognito, DynamoDB, S3, Lambda, or IAM resources solely to rename them;
move them only through an explicit data and identity migration.

---

## The one principle everything is built on

**Never trust a model for anything that can be checked.** This is not a style
preference; every part of the product would be actively harmful without it, and
most of the code that looks defensive exists because the naive version was tried
first and failed in testing.

| Where             | What the model is not allowed to assert                                                                                                                                                                                                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Coding problems   | Expected outputs. It writes the problem, two independent solutions, and test inputs; outputs are derived by executing the canonical solution, and only after it agrees with the brute force across 60 randomized inputs. Live testing showed it mispredicting its own function's output on 3–4 of 8 cases. |
| Résumé extraction | Any claim without a verbatim quote from the document, and any number not present in that quote. Failures are discarded, not flagged.                                                                                                                                                                       |
| Job requirements  | Any requirement without a quote from the posting.                                                                                                                                                                                                                                                          |
| Tailored bullets  | Any figure the cited confirmed claims do not contain.                                                                                                                                                                                                                                                      |
| The judge         | Its own pass/fail. `reconcileOutcomes` recomputes every verdict server-side from expectations the browser never received.                                                                                                                                                                                  |

If you add a feature where a model produces something checkable, check it.

---

## Hard constraints that will bite you

1. **The IAM user cannot update or delete.** `sweetplus-vercel` has DynamoDB
   `Query`, `GetItem`, and `PutItem` — that is all. No `UpdateItem`, no
   `DeleteItem`, and no S3 `GetObject`. This is deliberate and worth keeping: a
   leaked deploy key cannot destroy a user's history. Consequences already in
   the code, copy these patterns rather than reinventing them:
   - Concurrency uses conditional `PutItem` with a `version` attribute.
   - "Delete" is a tombstone flag or an expired TTL, never a real delete.
   - The refill lock is released by writing an _expired_ lock.
   - Résumés are parsed from the upload POST body, not fetched back from S3.

2. **Vercel Hobby crons must be daily.** An hourly `vercel.json` schedule fails
   the entire build and took production down once. `0 7 * * *` is what works.

3. **Coding problem signatures have no object types.** Only scalars and 1-D/2-D
   arrays. Graphs are a node count plus an `int[][]` edge list, grids are
   `int[][]`/`string[][]`, intervals are `int[][]` endpoint pairs. This is why
   there is no linked-list or binary-tree archetype — faking them would test
   array indexing rather than the thing worth asking about.

4. **`server-only` imports break vitest (jsdom).** This is why nearly every
   feature is split into a pure module (tested) and a thin server module
   (untested). Keep doing that; it is the reason there are 194 tests.

5. **One DynamoDB table, `pk`/`sk`, no GSI.** Anything you need to look up must
   be reachable by a direct key or a `begins_with` query on `sk`.

6. **Never rename AWS resources.** Renaming the Cognito pool deletes every
   account.

---

## What is real, and what is not

**Stage Fright** (interviews) — real. Text and OpenAI Realtime voice, scored
reports. Its coding interview draws from the Zed pool and runs the candidate's
code through the real judge, feeding actual verdicts to the interviewer.

**Zed** — real end to end. 30 archetypes generate validated
problems into a shared warm pool; the practice loop is classify → commit to a
complexity → pick edge cases → solve → coaching, all graded server-side. A
competency graph scores five of seven skills; the two conversational ones stay
unscored on purpose.

**Resume Kitchen** — real end to end as of this session. Upload → grounded
extraction → confirm → requirements read from a posting → matched → tailored
bullets → deterministic résumé score → publishable portfolio.

**Known not-real / unfinished:**

- Skills are extracted and stored but the portfolio page does not render them.
- Rewritten bullets are copy-to-clipboard; they do not write back to the
  evidence library, so the score does not move as you fix things.
- The Zed pool is only a few cells deep out of 90, so practice often generates
  inline and takes 11–28s.
- `CRON_SECRET` may still be unset in Vercel, in which case the daily warm cron
  does nothing.

---

## Layout

```
src/modules/execution/      port.ts (pure contract) + lambda-adapter.ts
src/modules/zed/           archetypes, generator, validation, pool, practice,
                            skills, stubs, signature — pure except pool/generator
src/modules/resume-kitchen/ grounding, extraction, requirements, tailoring,
                            scoring, document-text
src/modules/portfolio/      handle (pure), schema
src/modules/interviews/     context, conversation, plan, schema, coding/
src/modules/aws/            one store file per entity, all server-only
lambda/judge-python/        the judge; deploy with scripts/deploy-judge.sh
docs/EXECUTION_SETUP.md     judge + pool infrastructure, read this before AWS work
```

Every `src/modules/aws/*` file is `server-only`. Pure logic never imports them.

---

## Gotchas already paid for

- **OpenAI strict `json_schema` ignores `minItems`/`maxItems`.** State exact
  counts in the prompt and trim the result; do not reject on count.
- **Archetypes need explicit `exclusions`** or the model drifts — a "two
  pointers" request came back as a monotonic-deque problem.
- **PDF extraction splits words mid-token.** A real document produced
  `"Machine Lea\nrning"`. Any text matching against a PDF must ignore whitespace
  entirely. Matching on whitespace was silently discarding 8 of 17 résumé claims
  and losing whole jobs.
- **Extraction occasionally returns only the education section.** Three runs of
  the same résumé gave 6 entries each, so it is variance, not a broken prompt —
  but it is retried when the claim count is far below the document's bullet count.
- **Newly created IAM roles are not immediately assumable by Lambda.** Retry.
- **Warm Lambda environments cache VPC DNS.** Force cold starts before trusting
  a network test.
- **Anything passed as a prop to a client component is in the page source.**
  `toClientSession` and `toClientProblem` exist to strip interviewer-only and
  gate-answer fields. A type-only import is not enough to keep a module out of
  the client bundle — check the built chunks.

---

## Verifying

```bash
npm run typecheck && npm run lint && npm test -- --run && npm run build
```

All four must pass. 194 tests currently. For anything visual, render it and look
at it — two layout bugs this session passed typecheck and lint and were only
caught in a browser.

For pool/judge work, warm one cell directly:

```bash
curl -H "authorization: Bearer $CRON_SECRET" \
  "$APP_URL/api/zed/pool/warm?archetype=graph-bfs&difficulty=medium"
```

---

## Suggested next work

1. Render skills on the portfolio page (extracted and stored already).
2. Make rewritten bullets write back to the evidence library so the résumé score
   moves live instead of via copy-paste.
3. Keyword gap: the résumé's skills and the posting's requirements are both
   structured already, so "this role asks for Kubernetes twice and your résumé
   never mentions it" is nearly free.
4. Warm the Zed pool, and set `CRON_SECRET` in Vercel.
5. Larger, discussed but not started: a LeetCode companion mode (link out, never
   copy statements, so it can only be the conversational side — no judge), and
   interview-date-aware readiness across applications.
