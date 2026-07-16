# Autoresearch log — aral-2026-07-16

- `2026-07-16T01:43:30.138Z` Harness scaffolded: fidelity.eval.ts, status.mjs, gates.mjs, dashboard.mjs, RUNBOOK.md
- `2026-07-16T01:46:45.065Z` KILL TEST starting (drill)
- `2026-07-16T01:48:37.804Z` KILL switch detected — run aborted at phase boundary
- `2026-07-16T01:49:05.772Z` KILL TEST passed: torn-write, resume, kill-switch all green. Documented pattern-kill procedure in RUNBOOK.
- `2026-07-16T01:50:53.610Z` T0 done: baseline GFS 99.10 (accept 99.19%, reject 98.88%). Defect clusters: inequalities/H1 (19 ascii accept-fails), circles/M10 (19 tolerance reject-fails), integration-applications (4 tolerance reject-fails). Tests 154/154, tsc clean, bundle 2443383B.
- `2026-07-16T02:07:28.921Z` T1 done: 3 hypotheses ranked (exp-a H1 ascii-ineq ~63% defect reduction; exp-b M10 tolerance ~37%; exp-c combined ~100%). M8/M9 deferred: unmeasured at baseline, cannot pass G3.
- `2026-07-16T02:09:16.698Z` T2 launched: 3 experiment agents in isolated worktrees (exp-a, exp-b, exp-c)
- `2026-07-16T02:15:10.516Z` T3 done: all 3 candidates pass all 8 gates independently. Winner=exp-c-combined (GFS 100.0, delta +0.90, 100% defect reduction). Ranked: exp-c > exp-a(99.66) > exp-b(99.43). Orchestrator diff review APPROVED.
