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
- **choice** — one of a closed list of options, chosen with buttons.
- **text** — a word from a closed vocabulary (`circle`, `∞`).
- **multipart** — graded all-or-nothing. A part may be conditional
  (`when: { part, equals }`): "Does it converge? If so, to what?" is a verdict
  choice plus a limit that is asked for only when "converges" is chosen; every
  such question has this shape, so the shape reveals nothing, and a verdict
  without its limit earns no credit.
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

## Tests

- `npm test` — the app suite (includes a quick 150-seed sweep of every generator).
- `npm run test:sweep` — every generator × 2,000 seeds: generation never throws,
  structural checks and named invariants hold, each problem replays from its
  provenance, the canonical answer passes the production grader and every
  must-reject input fails; the independent recomputation suite runs on the
  same number of seeds.
- `npm run oracle` — development-only CAS oracle (needs `python3` with
  `sympy`): `scripts/oracle/export.eval.ts` turns generated problems into
  symbolic claims (derivatives, antiderivatives, definite and improper
  integrals, roots, limits, series, identities) reconstructed from the prompt
  text, and `scripts/oracle/check.py` proves each one with SymPy.
- `npm run typecheck`, `npm run build`.

`components/formulaSheets.test.tsx` renders every formula sheet and asserts the
hypotheses and domain conditions each statement needs.

`services/mathCorrectness.test.ts` recomputes every exercise family's answer
from the displayed text (independently of the generator) and reproduces the
grading cases from the reliability audit. The research fidelity score
(`research/`) measures whether the grader accepts what the generator meant; it
does not establish that the answer key is mathematically correct — that is
what the correctness suite is for.
