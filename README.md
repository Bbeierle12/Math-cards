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

Answer checking lives in `services/mathService.ts` (`validateAnswer`) and
`services/expressionGrader.ts`. The rules:

- **numeric** answers are exact (floating-point margin only). Students may type
  decimals, fractions (`3/5`) or exact constants (`sqrt(3)/2`, `pi/4`).
- **decimal-tolerance** answers store the *exact* value plus `roundTo`, the
  number of decimal places the problem text asks for. Any input within half a
  unit of that last place is accepted, so the correctly rounded value passes
  and the neighbouring rounded values fail. Problems that say "use π ≈ 3.14"
  accept only the 3.14-based value: the true-π value answers a different
  instruction.
- **expression** answers are compared by numeric sampling after normalising
  student notation (`xsin(x)`, `sin²θ`, `ln|cos x|`, `e^x`). Sample points
  include the critical values 0, ±1, ±2 plus points drawn from a PRNG seeded
  by the two expressions, so `x/x` is not `1` (undefined at 0) and a
  polynomial engineered to vanish on a fixed list of points cannot be smuggled
  in. A submission must be a finite real number wherever the reference is
  defined; `0/0`, `NaN` and complex-valued forms are always rejected.
  Equations (`x = 2 sin θ`) match when the two sides' difference is a nonzero
  constant multiple of the reference's, with any parameter name. Indefinite
  integrals use `equivalence: 'up-to-constant'`, so any antiderivative passes
  and the integrand fails.
- Word answers must be complete: a question that asks for convergence *and*
  the limit does not accept "yes" or "converges" alone.

`components/formulaSheets.test.tsx` renders every formula sheet and asserts the
hypotheses and domain conditions each statement needs.

`services/mathCorrectness.test.ts` recomputes every exercise family's answer
from the displayed text (independently of the generator) and reproduces the
grading cases from the reliability audit. The research fidelity score
(`research/`) measures whether the grader accepts what the generator meant; it
does not establish that the answer key is mathematically correct — that is
what the correctness suite is for.
