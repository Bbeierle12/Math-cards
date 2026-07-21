# Overnight Autoresearch Loop — Runbook

**Run ID:** `aral-2026-07-16` · **Repo:** Bbeierle12/Math-cards · **Harness branch:** `claude/overnight-autoresearch-loop-r360zk`

## Objective (the measurable thing)

**Maximize the Grading Fidelity Score (GFS).**

The repo's adversarial review (`ADVERSARIAL_REVIEW.md`, 38 confirmed defects) found the
dominant failure mode is *the app marking correct answers wrong*. GFS quantifies that:

```
GFS = 100 × (0.7 × accept-rate + 0.3 × reject-rate)
```

- **accept-rate** — over a seeded corpus (54 topics × 40 problems, seed `20260716`),
  the fraction of *correct, keyboard-typeable* answer variants that `validateAnswer`
  accepts (canonical form, ASCII `<=`/`>=`, unsimplified fractions, flipped
  inequalities, `u = …` prefixes, bare coordinates, …).
- **reject-rate** — the fraction of *clearly wrong* probe answers it rejects
  (off-by-one numbers, wrong inequality direction, swapped coordinates, near-miss
  decimals outside any legitimate tolerance, …).

The 30% reject weight is the anti-gaming counterweight: a candidate cannot win by
loosening the grader until everything passes. Determinism: `Math.random` is replaced
by a seeded mulberry32 PRNG per (topic, index), so identical code ⇒ identical corpus.

Guardrail metrics (gates, not objectives): test suite, typecheck, corpus latency,
production bundle size, generator error count.

## Phases

| Phase | What happens | Artifact written |
|---|---|---|
| **T0 baseline** | tests + tsc + build size + fidelity eval on unmodified code | `research/out/baseline.json`, `research/out/baseline-checks.json` |
| **T1 hypotheses** | rank fix hypotheses from ADVERSARIAL_REVIEW.md × per-topic GFS breakdown | `research/out/hypotheses.json` |
| **T2 experiments** | one agent per hypothesis, isolated git worktrees, branches `exp/<id>`; each implements the fix + regression tests and self-checks | `exp/<id>` branches, `research/out/exp-<id>-report.json` |
| **T3 verification** | independent re-measurement per candidate: tests, tsc, build, fidelity eval, `gates.mjs` vs baseline, diff-scope check, orchestrator diff review | `research/out/verdict-<id>.json` |
| **T4 winner** | rank all-green candidates by GFS delta; winner branch rebuilt from `origin/main` + fix commits → PR → **auto-merge to `main` iff every gate is green** (pre-authorized in the task brief); runner-ups recorded | merged PR, `research/out/final.json` |

After **every** phase: `status.json` update (atomic), `log.md` append, dashboard
regeneration, commit + push to the harness branch.

## Merge gates (all must be green)

| Gate | Rule |
|---|---|
| G1-tests | full vitest suite passes on candidate |
| G2-tsc | `tsc --noEmit` clean |
| G3-gfs-improves | ≥ **25% reduction of measured fidelity defect** (defect = 100 − GFS; GFS pools 54 mostly-healthy topics, so raw deltas are small by construction) |
| G4-reject-no-regress | reject-rate may not drop more than 1pp |
| G5-gen-errors | generator exceptions may not increase |
| G6-latency | corpus wall time and validate p95 ≤ 1.5× baseline |
| G7-bundle | production bundle ≤ 1.01× baseline |
| G8-diff-scope | diff touches none of: `research/`, `.github/`, `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig.json` |

Plus a non-mechanical gate: the orchestrator reads the winner's full diff before merge
(experiments may edit test files only to fix defective tests, e.g. review finding M19 —
any test edit gets extra scrutiny).

## State & resume protocol (surviving context limits)

`research/status.json` is the single source of truth; every write is atomic
(tmp + rename). It records: current phase, phase status, per-phase states,
experiment table, winner, event log, and `next_action` — a literal instruction
for what to do next.

**To resume after a context limit / restart / crash:**

1. `git checkout claude/overnight-autoresearch-loop-r360zk && git pull`
2. Read `research/RUNBOOK.md` (this file), then `node research/harness/status.mjs get`
3. Do whatever `next_action` says. Phases are idempotent: re-running a phase
   overwrites its artifacts and is always safe. A phase with `phase_status=running`
   that isn't actually running anymore simply gets re-run.
4. Before starting any phase: `node research/harness/status.mjs killcheck`
   (exit 3 ⇒ stop, the kill switch is set).

Everything is committed and pushed after each phase, so even container loss loses at
most one phase of work.

## Kill switch

`touch research/KILL` — the loop checks for this file at every phase boundary
(`status.mjs killcheck`) and aborts gracefully, marking
`phase_status=aborted-by-kill-switch`. Remove the file and re-run the phase to resume.

## Kill test (must pass BEFORE the real run)

Purpose: prove the loop can be killed at the worst moment and resumed without
corruption. Procedure (results recorded below when executed):

1. **Torn-write test** — start a drill fidelity eval (`RESEARCH_LABEL=drill`,
   `RESEARCH_OUT=research/out/drill.json`) in the background; while it runs, hammer
   `status.mjs event` writes; `kill -9` the eval mid-run. Verify:
   `status.json` parses as valid JSON, and `drill.json` either doesn't exist or is
   complete valid JSON (atomic rename means never torn).
2. **Resume test** — re-run the same drill to completion. Verify it produces a
   complete metrics file and that `status.mjs get`'s `next_action` still describes
   the correct next step (state was never corrupted).
3. **Kill-switch test** — `touch research/KILL`, run `status.mjs killcheck`,
   verify exit code 3 and `phase_status=aborted-by-kill-switch`; remove `KILL`,
   verify killcheck exits 0.

### Kill test results — EXECUTED 2026-07-16T01:47Z, ALL PASS

1. **Torn-write test — PASS.** A drill eval (N=5000, ~60s+ of work) was `kill -9`'d
   4s in; `research/out/drill.json` was never created (the atomic rename only happens
   on completion) and no stray `.tmp-*` files were promoted. Concurrently, a loop
   hammering `status.mjs set` was `kill -9`'d mid-write after 66 writes;
   `status.json` parsed as valid JSON with the last completed write intact.
2. **Resume test — PASS.** Re-running the same drill to completion produced a full
   valid metrics file (GFS 99.1, 1.1s wall) and `status.json`'s `next_action`
   survived untouched — no state corruption from the kills.
3. **Kill-switch test — PASS.** With `research/KILL` present, `killcheck` exited 3
   and set `phase_status=aborted-by-kill-switch`; after removing the file it exited 0.

**Operational lesson learned (now the documented kill procedure):** killing the
wrapper shell orphans the vitest worker tree. To kill a running eval use pattern
kills, not the wrapper PID — and note a plain pattern will match your own shell's
command line, so bracket the first character:

```bash
pkill -9 -f "[v]itest run --config research/harness"   # runner
pkill -9 -f "[n]ode_modules/vitest"                    # surviving fork workers
```

The orphan case is why the metrics write is atomic: an orphaned eval finishing
late can only ever produce a *complete* file, never a torn one.

## How to launch

```bash
# one-time drill (kill test), then:
node research/harness/status.mjs killcheck
RESEARCH_LABEL=baseline RESEARCH_OUT=research/out/baseline.json \
  npx vitest run --config research/harness/vitest.config.mts   # T0
# T1–T4 are orchestrated by the agent per this runbook, with status.json
# updated at every phase boundary.
```
