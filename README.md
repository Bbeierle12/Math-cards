<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1jBXtFdC_GnUA1lrbxnWUN2g4D7ph9gaz

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

## Grading contract

Every problem carries a typed answer contract, `problem.answer: AnswerSpec`
(`types.ts`), and one function interprets it: `grade(spec, input)` in
`services/grading/grade.ts` (`validateAnswer(problem, input)` in
`services/mathService.ts` is `grade(problem.answer, input)`). The switch over
answer kinds is exhaustive at compile time, so a generator cannot ship an
answer the grader does not understand. The kinds:

- **number** — a real value with an explicit tolerance policy:
  - `exact`: floating-point margin only. Students may type decimals,
    fractions (`3/5`) or any exact expression for the value (`sqrt(3)/2`,
    `pi/4`, `(7+5)/2`). Arithmetic-fluency topics set `form: 'evaluated'`:
    there, `+ − × ^` applied to two plain numbers restates the problem (`7+5`
    for 7 + 5) and is not an answer.
  - `decimalPlaces` / `significantFigures`: the problem says "round to N
    places/figures"; the spec stores the *exact* value and any input within
    half a unit of the last requested place is accepted, so the correctly
    rounded value passes and the neighbouring rounded values fail. Problems
    that say "use π ≈ 3.14" store the 3.14-based value: the true-π value
    answers a different instruction.
  - `absolute` / `relative`: explicit tolerances.
  - `unit: 'degree'` allows a typed `°` (or "degrees") after the number.
- **limit** — the limit of a sequence or the value of an improper integral,
  typed: a number, `∞` / `-∞` (also `inf`, `infinity`), or `DNE` / "does not
  exist". One input serves all three, so its shape never reveals whether the
  limit is finite, infinite or nonexistent; `∞` is not `DNE`, and "diverges"
  is not an answer.
- **fraction** — an exact rational, compared in BigInt arithmetic
  (`n·D = N·d`). Any equivalent fraction is accepted unless `lowestTerms` is
  set, for "simplify" tasks, where `14/12` for `7/6` is wrong.
- **expression** — normalised from student notation (`xsin(x)`, `sin²θ`,
  `ln|cos x|`, `e^x`) and compared under a declared **domain policy**:
  - `samePartialFunction` (default): at every point both sides are undefined,
    or both are finite reals and equal. So `x/x` is not `1`, and `log(x^2)` is
    not `2 log x`. `0/0`, `NaN` and complex-valued forms are always rejected.
  - `onDeclaredDomain`: equal on the declared `domain.intervals` only
    ("simplify log(x²) for x > 0": `2 log x` is correct).
  - `ignoreRemovableSingularities`: removable holes are skipped (x/x counts
    as 1), poles are not.
  - When both sides are polynomials (rational coefficients, π allowed), the
    verdict is **exact**: coefficients are compared in BigInt rational
    arithmetic, so a polynomial built to vanish on the sample points is
    rejected by its degree.
  - Otherwise the sides are sampled at **primary points** that depend only on
    the problem (the critical values 0, ±½, ±1, ±2, any declared critical
    points, plus points from a PRNG seeded by the reference), so every
    spelling of an answer is tested at the same points. A short
    **confirmation stream** keyed by the submission can only reject: a
    genuine identity holds everywhere, so a correct answer is never affected,
    but a function built to vanish on the published primary points is caught.
  - Each sampled point is judged at its own magnitude (relative tolerance
    10⁻⁸ of the larger side there, at least 10⁻⁸ absolute), so a large value
    at one point (e^{4b} at b = 6) cannot excuse an error elsewhere.
  - No symbolic `simplify(user − reference) = 0` shortcut: it would identify
    `x/x` with `1`.
  - An assignment `u = x² + 5` is not an expression. It is accepted only when
    the spec declares the name (`assignable: ['u']`).
- **equation** (`x = 2 sin θ`) — matches when the submission's residual
  (lhs − rhs) is a nonzero constant multiple of the reference's, with the same
  zero set and domain (`2x = 4 sin θ` passes; `x² = 4 sin² θ` does not). Only
  declared `parameters` (`['theta']`) may be renamed: `x = 2 sin t` passes,
  `y = 2 sin θ` does not. A bare expression is not an equation.
- **interval** — the solution set of an inequality, as a union of intervals.
  Students may write `x < 4`, `4 > x`, `x <= 4`, `1 < x ≤ 3`, `(-∞, 4]`,
  `[2, inf)`, `(-inf, 1) U (3, inf)` or `x ∈ (1, ∞)`; the sets are compared
  exactly (endpoints and closedness). A different variable is wrong, and an
  infinite endpoint equals only itself.
- **finiteSet** — e.g. all real roots: `2, -3`, `{2, -3}` or `x = 2 or x = -3`,
  compared as sets. A missing or an extra element is wrong.
- **antiderivative** — graded against the *integrand*: the submission is
  differentiated and must equal the integrand wherever the integrand is
  defined, and the submission itself must be defined there. `−ln(cos x)` fails
  for ∫tan x (undefined where cos x < 0); `x ln|x| − x` passes for ∫ln x (only
  x > 0 is compared); `+ C` is allowed. The spec's reference antiderivative is
  an independent second vote.
- **choice** — a word from a closed list ("converges", "increasing",
  "inconclusive"), **typed**; there are no answer buttons. A verdict word is
  never an answer on its own: it always sits in a multipart answer beside the
  typed quantity that decides it (the ratio-test limit L, the exponent p, the
  common ratio r, bₙ = |aₙ|, aₙ₊₁ − aₙ, the partial integral I(b)), so a guess
  earns nothing.
- **text** — a word from a closed vocabulary, typed.
- **multipart** — graded all-or-nothing. A part may be conditional
  (`when: { part, equals }`): a geometric series asks for its common ratio, the
  verdict, and the sum only after "converges" is typed.
- **anyOf** — any one of several acceptable answers of the same kind (e.g. the
  sine or the cosine substitution).

`services/grading/canonical.ts` derives from a spec a canonical input (a
correct answer exactly as a student could type it), inputs that must be
rejected, and a display form; the tests, the generator checks and the research
harness use these instead of hand-built probes.

## Problem generation

Generators live in `services/generators/`, one module per curriculum level,
registered in `services/generators/index.ts`. A generator is a pure function
of a seeded RNG and the learner's settings:
`generateProblem(topicId, settings, seed)` always returns the same problem,
and every problem records its provenance (`generatorId`, `generatorVersion`,
`seed`, `templateId`, `settings`), so a problem from a bug report can be
replayed exactly. Generators state the validity conditions of an instance with
`ctx.require(condition, 'invariant')`; a violated invariant discards the draft
and retries on a derived seed, and a generator that cannot produce a valid
instance fails loudly instead of shipping an invalid problem.

## Worked solutions and input preview

- **Worked solutions.** `problem.solution` is a list of steps. A theorem step
  names the result, states each hypothesis together with its check for this
  instance, and only then gives the conclusion (Integral Test: positive,
  continuous, decreasing; then the integral; then the verdict). Generators
  that give no steps have their explanation split into sentences. A theorem
  step without hypotheses, or a hypothesis without its check, fails the
  structural checks, and the sweep renders every step with KaTeX. After a
  wrong answer the practice screen shows the solution (automatically, or on
  request).
- **Input preview.** Under each typed answer, "Reads as:" shows how the grader
  parses the input (`services/grading/preview.ts`, which uses the same
  normalizer and set parsers as `grade`), so `√3/2`, `1/2x` or `x < 3` can be
  checked before submitting. It never says whether the answer is right.
- **Symbol keys** (π, √, ^, θ, ∞, °, ≤, ≥, ∪) insert at the caret. Which keys
  appear depends only on the answer kind, never on the answer itself.

## Progress, mastery and reviews

Progress is an append-only log of attempts (`learningLog` in localStorage);
every counter, status and schedule is derived from it
(`services/learning/`), so changing the threshold in settings re-evaluates
the whole history.

- **Evidence.** A correct first attempt on a problem not seen before counts
  1; a hint halves it; an exact repeat of a problem already seen counts a
  quarter; an error subtracts ½ (never below 0).
- **Proficient** when evidence reaches the threshold (default 10) *and* the
  correct answers span at least min(3, available) of the topic's problem
  types. Unlocking the next topic needs proficiency.
- **Mastered** when a scheduled review taken at least 3 days after reaching
  proficiency is passed on the first try, without a hint. Reviews follow a
  1 → 3 → 7 → 21 → 60-day ladder (a late success skips rungs; a miss halves
  the interval and returns a mastered skill to proficient). Due reviews are
  listed at the top of the topic list.
- **Next problem.** Practice aims at the problem type with the fewest
  correct answers and always uses a fresh seed, avoiding problems already
  seen. Every topic offers at least 15 distinct problems, and a test checks
  that each reaches proficiency in exactly `threshold` fresh correct answers.
- **Migration.** Counter-based progress from earlier versions becomes the
  starting point of the log (a topic mastered under the old rule stays
  proficient and is scheduled for review). The old `userProgress` key is
  read once and never modified, so reverting the app restores it.

## Tests

- `npm test` — the app suite (includes a quick 150-seed sweep of every generator).
- `npm run test:sweep` — every generator × 2,000 seeds: generation never throws,
  structural checks and named invariants hold, each problem replays from its
  provenance, the canonical answer passes the production grader and every
  must-reject input fails; the independent recomputation suite runs on the
  same number of seeds. It also runs the **guessability gate**
  (`services/learning/guessing.gate.ts`): simulated students who ignore a
  problem's numbers (typing, per problem type, the answer most often right,
  or random verdict words) must reach proficiency in at most 1% of runs of
  200 attempts, under the real scheduler and mastery rules. Most topics are
  cleared by a proof (a Cramér–Lundberg bound on the evidence random walk)
  rather than by simulation.
- `npm run oracle` — development-only CAS oracle (needs `python3` with
  `sympy`): `scripts/oracle/export.eval.ts` turns generated problems into
  symbolic claims (derivatives, antiderivatives, definite and improper
  integrals, roots, limits, series, identities) reconstructed from the prompt
  text, and `scripts/oracle/check.py` proves each one with SymPy.
- `npm run typecheck`, `npm run build`.

The formula sheets render from a fact registry (`data/facts.ts`): each fact has
its statement, the hypotheses under which it holds, a conclusion where it is a
test or theorem, an editorial source (OpenStax, DLMF) and, where useful, a
counterexample showing why a hypothesis is needed.
`components/formulaSheets.test.tsx` asserts that every theorem, test and rule
states its hypotheses, that no condition is hidden inside a statement, that
every formula renders, and that each sheet shows the hypotheses next to their
statement.

`docs/cas-evaluation.md` records why a second symbolic library (CortexJS
Compute Engine) was evaluated and not adopted.

`services/mathCorrectness.test.ts` recomputes every exercise family's answer
from the displayed text (independently of the generator) and reproduces the
grading cases from the reliability audit. The research fidelity score
(`research/`) measures whether the grader accepts what the generator meant; it
does not establish that the answer key is mathematically correct — that is
what the correctness suite is for.
