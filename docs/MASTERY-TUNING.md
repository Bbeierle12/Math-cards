# Tuning the mastery rules

Status: proposed · Baseline: `main` at ce06b61 (PLAN Phases 1–4 merged)

"Proficient" claims that the student will probably solve a fresh problem of this skill
unaided. "Mastered" claims they still can after a delay. Tuning means making those claims
measurably true: accurate, not lenient. The app has no backend, so every decision
below says what evidence it rests on: arithmetic on the generators (available now), or
attempt data (collected slowly, see Phase 4).

## Current rules

| Parameter | Value | Where |
|---|---|---|
| Correct first attempt, new problem | +1 | `services/learning/mastery.ts` `evidenceWeight` |
| Correct retry | +0.25 | same |
| Hint used | × 0.5 | same |
| Exact repeat of a seen problem | × 0.25 | same |
| Error | −0.5, floor 0 | `DEFAULT_RULES.errorPenalty` |
| Proficiency threshold | 10 (setting) | `constants.ts` `masteryThreshold` |
| Template spread | min(3, available) | `DEFAULT_RULES.minTemplates` |
| Mastery | one review, passed first try without a hint, ≥ 3 days after proficiency | `DEFAULT_RULES.reviewDelayDays` |
| Review ladder | 1 → 3 → 7 → 21 → 60 days, then × 2.5; a lapse halves the interval | `services/learning/schedule.ts` |

None of these numbers was derived from anything. They are placeholders.

## What is already known (measured on the generators, 2026-09-27)

**1. Guessing passes Series & Convergence.** I simulated students who answer without
reading, against the real generators and the real rules (200 runs each, capped at 400
attempts):

| Topic | Strategy | Reached proficiency | Median attempts |
|---|---|---|---|
| series-convergence | always "diverges" | 200 / 200 | 43 |
| series-convergence | random verdict | 129 / 200 | 113 |
| sequences, improper-integrals, polar-coordinates | any guessing strategy | 0 / 200 | — |

The cause is arithmetic. On a two-option item a guesser is right half the time, so the
expected change in evidence per attempt is ½·(+1) + ½·(−0.5) = +0.25 > 0. Any rule whose
guessing drift is positive is eventually passed by guessing. The other topics survive only
because they mix in typed answers.

**2. Where a guess can succeed.** These are the templates answered by picking an option.
Everything else is typed, where a guess is essentially never right.

| Template | Answer |
|---|---|
| series-convergence: p-series, ratio-test, nth-term, alternating, integral-test | converges / diverges |
| series-convergence: geometric; sequences: rational-limit, power-limit, geometric-limit, mct; improper-integrals: all three | verdict + value (the value is asked only after "converges", so "diverges" is a free guess whenever the answer diverges) |
| sequences: monotonic | yes / no |
| polar-coordinates: identify-curve | circle / line |

**3. A template that gives its own answer away.** `series-convergence/nth-term` is
*always* "diverges". The prompt names the nth-term test, and that test can only ever show
divergence. It trains nothing.

**4. One review decides mastery.** On a two-option item a coin flip passes it half the
time, and even on typed items one success is weak evidence of retention.

## Phase 0: guessability gate (no data needed)

Add `services/learning/guessing.test.ts`, which runs the simulation above for every topic.
The strategies are uniform random choice and each constant option. Typed answers count as
wrong. Assert: **P(proficient within 200 attempts) ≤ 1% for every strategy on every
topic.** This fails today on series-convergence. It becomes a CI gate, so a future
generator or rule change cannot reintroduce the hole.

Acceptance: the test exists, fails on `main`, and passes after Phases 1–2.

## Phase 1: remove two-option answers (content)

This is the decision point you raised. My recommendation: **every verdict question also
asks for the quantity that decides the verdict, typed, graded all-or-nothing with the
verdict.** The typed part is what makes guessing useless. The verdict still has to be
stated, because deciding it is the skill.

| Template | New answer |
|---|---|
| p-series | $p$ (typed) + verdict |
| ratio-test | $L$ (typed; ∞ allowed) + verdict |
| integral-test | the value of $\int_2^\infty f$ (typed; ∞ allowed) + verdict |
| geometric (series) | $r$ (typed) + the sum, or "diverges" |
| nth-term | $\lim a_n$ (typed) + "diverges" / **"test is inconclusive"**. Add cases with $\lim a_n = 0$ (e.g. $\frac{1}{n}$, $\frac{1}{n^2}$), so the right conclusion is sometimes "inconclusive". This teaches the test's actual limit. |
| alternating | $\lim_{n\to\infty} \lvert a_n\rvert$ (typed) + "converges absolutely" / "converges conditionally" / "diverges" |
| sequences (limit templates), improper integrals | one typed value: a real number, ∞, or −∞, or a "does not exist" choice for oscillation. No bare "diverges". |
| sequences / monotonic | $a_{n+1} - a_n$ simplified (typed expression) + "increasing" / "decreasing" / "neither" |
| polar / identify-curve | the Cartesian equation (typed equation), not "circle / line" |

Each change bumps the generator version and extends the checks we already have:
- the sweep;
- `mathCorrectness` recomputation of the new typed parts;
- oracle claims for them;
- `wrongInputs` that include every bare-verdict guess.

The alternative is keeping two-option items and relying only on the chance correction in
Phase 2. That is sound statistically, but a correct two-option answer is then worth about
0.4 of a typed one, so those topics need two to three times as many problems. That is
slower for students and still teaches less.

Acceptance: no template is answerable by option choice alone, and the Phase 0 gate passes
on content alone (before Phase 2).

## Phase 2: evidence as a likelihood ratio (principled weights, no data needed)

Replace the hand-set +1 / −0.5 with the log-likelihood ratio between two hypotheses about
the student's true accuracy $p$:
- $H_0$: $p \le p_0$ (not yet proficient);
- $H_1$: $p \ge p_1$ (proficient).

On an item with chance rate $c$ (the probability of a correct guess), the observed success
rate is $c + (1 - c)p$. So:

- correct: $+\ln\frac{c + (1-c)p_1}{c + (1-c)p_0}$
- error: $\ln\frac{(1-c)(1-p_1)}{(1-c)(1-p_0)} = \ln\frac{1-p_1}{1-p_0}$

The evidence is kept as a CUSUM, $S \leftarrow \max(0, S + w)$ (the current "floor 0" is
already this shape), and proficiency is $S \ge h$. The CUSUM is the standard detector for
"has this sequence switched to the proficient regime". It suits learners, whose accuracy
changes over time, which a fixed-sample test does not.

- **$c$ comes from the generator, not from data.** It is the best guessing strategy's
  success rate for the template, measured by the Phase 0 harness and stored per template.
  It is 0 for typed answers.
- **$p_0$, $p_1$ and $h$ are policy.** A harness simulates students of known accuracy and
  reports how often, and how fast, each reaches proficiency. Current results with
  $p_0 = 0.5$, $p_1 = 0.85$ ("% within 200 attempts, median attempts"):

| $h$ | typed, $p = 0.5$ | typed, $p = 0.7$ | typed, $p = 0.85$ | typed, $p = 0.95$ | two-option, coin flip | two-option, $p = 0.85$ |
|---|---|---|---|---|---|---|
| 5 | 19%, 104 | 99%, 36 | 100%, 16 | 100%, 10 | 0% | 100%, 38 |
| 6 | 7%, 89 | 98%, 49 | 100%, 18 | 100%, 12 | 0% | 100%, 49 |
| 7 | 2.4%, 102 | 94%, 61 | 100%, 22 | 100%, 15 | 0% | 100%, 55 |

  The honest reading: guessers are excluded at any of these thresholds, but **no threshold
  separates a 70% student from an 85% student in a reasonable number of problems**.
  Telling 0.7 from 0.85 apart takes dozens of observations, whatever the rule. So
  "proficient" must be defined by the level we need to exclude. The stricter policy,
  $p_0 = 0.7$, $p_1 = 0.9$ (a correct typed answer is worth +0.25, an error −1.10):

| $h$ | typed, $p = 0.7$ | typed, $p = 0.8$ | typed, $p = 0.85$ | typed, $p = 0.9$ | typed, $p = 0.95$ | two-option, coin flip |
|---|---|---|---|---|---|---|
| 4 | 29%, 104 | 93%, 62 | 100%, 38 | 100%, 27 | 100%, 19 | 0% |
| 5 | 11%, 114 | 78%, 86 | 99%, 53 | 100%, 34 | 100%, 26 | 0% |
| 6 | 3.6%, 122 | 63%, 100 | 96%, 67 | 100%, 40 | 100%, 30 | 0% |

  So excluding 70% students (≤ 5% false passes) costs a 90% student about 40 problems per
  topic, against about 18 under $p_0 = 0.5$. That is your call. The harness makes the
  trade explicit.

- **Hints, retries and repeats** keep their current multipliers for now, applied to the
  positive weight. They are the part the likelihood framing cannot fix without data
  (Phase 4).
- **Template spread** (min 3) stays. It guards transfer, which accuracy alone does not
  measure.
- **Re-evaluation.** State is a pure fold, so the new rule re-derives every existing
  student's status from their log. In keeping with "accurate over lenient", statuses are
  recomputed rather than grandfathered. Skills from the pre-log counter format keep their
  legacy baseline. A one-time notice says which topics changed.

Acceptance:
- the harness and a table like the one above are committed with the chosen $p_0$, $p_1$
  and $h$;
- the Phase 0 gate passes with a two-option template temporarily restored;
- every topic still reaches proficiency on fresh problems, the test that exists today.

## Phase 3: mastery as a delayed check, not a single item

Mastery requires a **review set** taken ≥ `reviewDelayDays` after proficiency. The set is
3 fresh problems on distinct templates, first try, no hints, all correct. For a coin flip
on two-option items that passes with probability 1/8, and with Phase 1 there are no
two-option items. A miss returns the skill to proficient, as now. The ladder is unchanged
until Phase 4.

Acceptance: a simulated student who is proficient on day 0 and at chance on day 3 is
marked mastered with probability ≤ 1%.

## Phase 4: calibrate from attempt data (slow; gated on sample size)

**Collection, client-only:**
- "Export learning data" in Settings downloads the full event log as JSON.
- Compaction (5,000 events) must not destroy what calibration needs. Before folding
  events into the baseline, append them to an export archive in IndexedDB.
- Nothing leaves the device unless the student exports it.

**Analysis** (`scripts/calibrate/`, dev-only, Python):
- **Evidence weights.** Fit a Performance Factors Analysis model: a logistic regression
  of first-attempt correctness on a fresh problem, against the counts of prior outcomes by
  kind (unassisted correct, hinted correct, retry correct, repeat correct, error), per
  skill, with a per-template difficulty. The fitted coefficients' ratios are the empirical
  weights of a hint, a retry and a repeat, replacing the × 0.5 / 0.25 / 0.25 placeholders.
- **Proficiency validity.** Among skills just marked proficient, measure accuracy on the
  next 5 fresh problems, with a Wilson interval. Target: its lower bound ≥ $p_1$ minus a
  stated margin.
- **Review ladder.** Model recall probability against elapsed time and interval (the FSRS
  retrievability curve). Choose intervals that target 90% recall at review. Use the
  published FSRS defaults as the prior until the data supports refitting.

**Sample-size gates.** No parameter changes until its gate is met:

| Parameter | Needs |
|---|---|
| Proficiency validity to ±0.05 | ≈ 350 post-proficiency fresh attempts |
| Hint, retry and repeat weights | ≈ 200 events of each kind across ≥ 10 skills |
| Review ladder | ≈ 300 reviews spread over ≥ 3 rungs |

With one student this is months of use. The plan says so rather than tuning on noise.

Acceptance: export and archive shipped; the analysis script runs on an exported log and
prints each estimate with its interval and whether its gate is met.

## Order and dependencies

```
Phase 0 (gate) ──► Phase 1 (content) ──► Phase 2 (LLR evidence) ──► Phase 3 (review set)
                                                     └──► Phase 4 (export now; tune when gates are met)
```

Phases 0–3 need no user data and can ship now. Phase 4's export should ship early,
because data collection is the long pole.

## Decisions needed

1. **Two-option answers:** replace them all as in Phase 1 (recommended), or keep some and
   rely on chance-corrected weights.
2. **What "proficient" must exclude:** the accuracy a student can have and still *not* be
   proficient ($p_0$). 0.5 is fast (about 18 problems for a 85% student at $h = 6$), but
   a 70% student passes almost surely. 0.7 excludes 70% students (3.6% false passes at
   $h = 6$), but a 90% student needs about 40 problems and an 85% student about 67.
