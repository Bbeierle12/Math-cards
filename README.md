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

Answer checking lives in `services/mathService.ts` (`validateAnswer`) and the
grading engine in `services/grading/`. The rules:

- **numeric** answers are exact (floating-point margin only). Students may type
  decimals, fractions (`3/5`) or any exact expression for the value
  (`sqrt(3)/2`, `pi/4`, `(7+5)/2`). Arithmetic-fluency topics set
  `requiredForm: 'evaluated'`: there, `+ − × ^` applied to two plain numbers
  restates the problem (`7+5` for 7 + 5) and is not an answer.
- **decimal-tolerance** answers store the *exact* value plus `roundTo`, the
  number of decimal places the problem text asks for. Any input within half a
  unit of that last place is accepted, so the correctly rounded value passes
  and the neighbouring rounded values fail. Problems that say "use π ≈ 3.14"
  accept only the 3.14-based value: the true-π value answers a different
  instruction.
- **expression** answers are normalised from student notation (`xsin(x)`,
  `sin²θ`, `ln|cos x|`, `e^x`) and compared as the *same partial function*:
  at every point both sides are undefined, or both are finite reals and equal.
  So `x/x` is not `1`, and `log(x^2)` is not `2 log x` whichever of the two is
  the reference. `0/0`, `NaN` and complex-valued forms are always rejected.
  - When both sides are polynomials (rational coefficients, π allowed), the
    verdict is **exact**: coefficients are compared in BigInt rational
    arithmetic, so a polynomial built to vanish on the sample points is
    rejected by its degree.
  - Otherwise the sides are sampled at **primary points** that depend only on
    the problem (the critical values 0, ±½, ±1, ±2 plus points from a PRNG
    seeded by the reference), so every spelling of an answer is tested at the
    same points. A short **confirmation stream** keyed by the submission can
    only reject: a genuine identity holds everywhere, so a correct answer is
    never affected, but a function built to vanish on the published primary
    points is caught.
  - No symbolic `simplify(user − reference) = 0` shortcut: it would identify
    `x/x` with `1`.
- **equations** (`x = 2 sin θ`) match when the submission's residual
  (lhs − rhs) is a nonzero constant multiple of the reference's, with the same
  zero set and domain (`2x = 4 sin θ` passes; `x² = 4 sin² θ` does not). Only
  parameters the problem declares (`parameters: ['theta']`) may be renamed:
  `x = 2 sin t` passes, `y = 2 sin θ` does not.
- **antiderivatives** (`equivalence: 'antiderivative'`) are graded against the
  *integrand*: the submission is differentiated and must equal the integrand
  wherever the integrand is defined, and the submission itself must be defined
  there. `−ln(cos x)` fails for ∫tan x (undefined where cos x < 0);
  `x ln|x| − x` passes for ∫ln x (only x > 0 is compared); `+ C` is allowed.
  The stored antiderivative is an independent second vote.
- **multipart** answers are graded all-or-nothing. "Does it converge? If so,
  to what?" is a verdict choice plus a limit that is asked for only when
  "converges" is chosen; every such question has this shape, so the shape
  reveals nothing, and a verdict without its limit earns no credit.
- **multiple-choice** answers are one of the listed options.

`components/formulaSheets.test.tsx` renders every formula sheet and asserts the
hypotheses and domain conditions each statement needs.

`services/mathCorrectness.test.ts` recomputes every exercise family's answer
from the displayed text (independently of the generator) and reproduces the
grading cases from the reliability audit. The research fidelity score
(`research/`) measures whether the grader accepts what the generator meant; it
does not establish that the answer key is mathematically correct — that is
what the correctness suite is for.
