# Math-Cards: Mathematical Architecture Plan

Status: proposed · Baseline: `main` after PR #9 and PR #10 · Owner: repository maintainer

This plan turns the comparative design review (WeBWorK, STACK, Numbas, IMathAS, Alcumus,
ALEKS, IXL, FSRS) into sequenced engineering work. It keeps the constraints already
decided for this project:

- **Client-only.** No backend, no LLM in the grading or explanation path.
- **Accurate over lenient.** A submission is correct only if it is the mathematical
  object the problem asked for, on the stated domain, in the stated form.
- **Independently verified.** Every answer key is checked by a computation that does not
  share its derivation, and every grading rule has an adversarial test.

The two weaknesses the review identified are (1) one generic equivalence predicate
standing in for several different notions of equality, and (2) mastery inferred from a
raw correct count over small, repeating item pools. Phases 1–2 address the first, Phase 3
the second, Phase 4 the surrounding pedagogy.

---

## Phase 1 — Grading contract tightening (one PR, no schema migration)

Goal: remove the remaining implicit rules from the grader without changing the `Problem`
shape that generators and the UI consume.

| # | Change | Files | Acceptance |
|---|---|---|---|
| 1.1 | **Seed sample points from the problem, not the submission.** Seed = FNV(reference expression + checker version). Two spellings of one answer are tested at identical points. | `services/expressionGrader.ts` | Test: `x*sin(x)+cos(x)` and `cos(x)+xsin(x)` produce identical point sets; existing adversarial tests still pass. |
| 1.2 | **Declared parameters.** Replace "rename any variable other than x" with an explicit `parameters?: string[]` on the problem (e.g. `['theta']`). Only declared parameters may be alpha-renamed. | `types.ts`, `expressionGrader.ts`, trig-substitution generator | Test: `x = 2 sin t` accepted when `theta` is declared; `y = 2 sin theta` rejected (y is not a declared parameter). |
| 1.3 | **Antiderivatives by differentiation.** Store the integrand; grade by `d/dx(submission) ≡ integrand` under the domain rule, with the stored antiderivative kept only for display. Keep the constant-difference check as a second vote. | `expressionGrader.ts`, `mathService.ts` integration banks | Test: every existing antiderivative case passes; `x*cos(x)` (the integrand itself) fails; `-ln(cos x)` still fails on domain. |
| 1.4 | **Canonical polynomial comparison.** When both expressions `rationalize` to polynomials in one variable, compare coefficient vectors exactly (rational arithmetic) instead of sampling. Falls back to sampling otherwise. | `expressionGrader.ts` | Test: Taylor polynomial and eliminate-the-parameter answers graded by coefficients; `x + (x-0.37)(x-0.91)…` rejected by degree, not by luck. |
| 1.5 | **Per-problem arithmetic-form flag.** Move the global "7+5 is not an answer" rule into `requiredForm: 'evaluated'` set by the arithmetic, decimals, order-of-operations and integers generators. All other numeric answers accept any exact constant expression. | `types.ts`, `expressionGrader.ts`, `mathService.ts` | Test: `7+5` rejected on addition, `(1+sqrt(2))/2` accepted on an exact-value problem, `(7+5)/2` accepted where no form is required. |
| 1.6 | **Multipart answers.** New `answerType: 'multipart'` with typed components. Convert "does it converge, and to what?" into `[{kind:'choice', options:['converges','diverges']}, {kind:'numeric'}]`, all-or-nothing scoring. Remove the spelled-out alternates. | `types.ts`, `mathService.ts` sequences, `validateAnswer`, `PracticeSession.tsx` (two inputs) | Test: `converges, 0` full credit; `converges` alone or `0` alone rejected. |
| 1.7 | **Corpus test.** Add the review's pathological-equivalence corpus as a table-driven test with the expected verdict under each domain policy that exists today. | `services/expressionGrader.test.ts` | All rows assert; the table becomes the regression oracle for Phase 2. |

Corpus (submission vs reference → verdict under "same partial function"):

```
x/x                 vs 1                      reject
(x^2-1)/(x-1)       vs x+1                    reject
sqrt(x^2)           vs abs(x)                 accept
sqrt(x^2)           vs x                      reject
log(x^2)            vs 2*log(x)               reject (differ for x < 0)
ln(cos(x))          vs ln(abs(cos(x)))        reject
tan(x)              vs sin(x)/cos(x)          accept
1/(x-1)             vs (x+1)/(x^2-1)          reject (hole at x = -1)
sin(x)^2+cos(x)^2   vs 1                      accept
```

Exit criteria: `tsc` clean, all suites green, research harness GFS unchanged or higher,
no generator text changes except the sequence questions' input instructions.

---

## Phase 2 — Typed answer specification and replayable generators

Goal: make each generator say what mathematical object it asks for, under which equality,
on which domain, in which form; and make every generated problem reproducible from a seed.

### 2.1 `AnswerSpec` (replaces `answerType` + loose fields)

```ts
type AnswerSpec =
  | { kind: 'number'; value: Exact; tolerance: NumericTolerance; form?: FormConstraint[] }
  | { kind: 'expression'; reference: string; variables: string[]; parameters?: string[];
      domain: DomainSpec; domainPolicy: 'samePartialFunction' | 'onDeclaredDomain' | 'ignoreRemovableSingularities';
      equivalence: 'polynomial' | 'rational' | 'sampling'; form?: FormConstraint[] }
  | { kind: 'equation'; lhs: string; rhs: string; parameters?: string[] }          // residual up to nonzero scalar
  | { kind: 'solutionSet'; elements: Exact[] } | { kind: 'intervalUnion'; intervals: Interval[] }
  | { kind: 'antiderivative'; integrand: string; variable: string; domain: DomainSpec }
  | { kind: 'multipart'; parts: AnswerSpec[]; scoring: 'allOrNothing' }
  | { kind: 'text'; accepted: string[] };

type NumericTolerance =
  | { kind: 'exact' } | { kind: 'absolute'; tol: number } | { kind: 'relative'; tol: number; zeroGuard: number }
  | { kind: 'decimalPlaces'; places: number } | { kind: 'significantFigures'; figures: number };

type DomainSpec = { intervals: Interval[]; excluded?: Exact[]; criticalPoints?: Exact[] };
```

Migration: `validateAnswer(problem, input)` becomes an adapter over `grade(spec, input)`.
Generators migrate one family at a time; a compile-time exhaustiveness check prevents a
generator from shipping without a spec.

Every `expression` spec carries a `DomainSpec`; the grader samples on each connected
component, at declared critical points, at boundary-adjacent points, and at problem-seeded
random points. The "student defined wherever reference defined" rule becomes the
`samePartialFunction` policy and is no longer directional: equality of definedness is
checked both ways on the declared domain.

### 2.2 Seeded, replayable generators

```ts
type Generator = (seed: string, settings: GeneratorSettings) => GeneratedProblem;
interface GeneratedProblem { generatorId: string; version: number; seed: string; templateId: string;
  prompt: string; answer: AnswerSpec; explanation: string; invariants: InvariantResult[] }
```

- Replace `Math.random` in generators with a seeded PRNG passed in; the practice session
  draws the seed. The research harness stops monkey-patching `Math.random`.
- Encode degenerate-case rules as named invariants (`nonZeroDenominator`,
  `uniqueRealSolution`, `answerNotTrivial`, `triangleInequality`, `distinctChoices`), with
  bounded retry and a loud failure when a generator cannot satisfy them.
- CI sweep: every generator × 2,000 seeds; asserts generation never throws, invariants
  hold, the key passes the production grader, a perturbed key fails, and the independent
  recomputation from `mathCorrectness.test.ts` agrees.
- Development-only oracle: a script (not shipped) that cross-checks polynomial identities,
  derivatives and definite integrals with SymPy via Pyodide, run on the same seeds.

Exit criteria: every generator emits an `AnswerSpec`; `Math.random` no longer referenced
in `services/`; a seed printed in a bug report reproduces the exact problem, key, domain
and sample points.

---

## Phase 3 — Evidence-based mastery and retention

Goal: "mastered" should mean transferable and retained, not "ten correct answers, possibly
on the same four items".

### 3.1 Event log (replaces the correct/attempted counters)

```ts
interface AttemptEvent { t: number; skillId: TopicId; generatorId: string; templateId: string; seed: string;
  correct: boolean; firstAttempt: boolean; hintUsed: boolean; responseMs?: number }
interface SkillState { evidence: number; templatesSeen: Set<string>; lastReviewAt: number; dueAt: number;
  stability: number; lapses: number }
```

Stored in localStorage (IndexedDB if capacity becomes an issue); counters are derived, never
stored. A one-time migration converts existing `topicProgress` into synthetic events so no
one loses progress.

### 3.2 Mastery rule (initial defaults, to be calibrated from event data)

A skill is **proficient** when weighted evidence ≥ threshold, where first-attempt correct
on a fresh seed counts 1.0, correct after a retry counts 0.25, and evidence from a template
already seen twice counts 0.5; and evidence spans ≥ 3 distinct templates where 3 exist.
A skill is **mastered** when proficient and a scheduled review ≥ 3 days later is passed
first-attempt. Errors on review drop the skill back to proficient (reversibility, as in
Alcumus). Topics whose bank cannot supply 3 templates cap at proficient and the UI says why.

### 3.3 Scheduling

A simple stability-based scheduler (1 day → 3 → 7 → 21 → 60; errors halve the interval,
delayed successes lengthen it). The scheduler picks a skill and template, then generates a
fresh seed; it never replays an instance. Unlocking continues to use proficiency so the
curriculum path is unchanged.

### 3.4 Parametrize the Calculus 2 banks

Replace each 4–9 item bank with ≥ 3 structural templates × random parameters:
integration by parts (`x·e^{ax}`, `x^n ln x`, `x·sin(bx)`), trig integrals (power
reduction, u-sub families, `tan`/`sec` families), trig substitution (`√(a²−x²)`,
`√(x²+a²)`, `√(x²−a²)` with random a and both substitution forms), improper integrals
(p-integrals with random p, exponential decay with random rate), series convergence
(geometric with random ratio, p-series with random p, ratio-test families), Taylor
(random centre and degree, coefficient questions, Lagrange bounds with random x). Every
template ships with its invariant list and a recomputation test.

Exit criteria: no topic depends on exact-item repetition for mastery; a review queue
exists; existing users see their progress preserved.

---

## Phase 4 — Explanations, input, and reference facts

- **Structured solutions.** Generators emit `SolutionStep[]` (equation rewrite, statement
  with bindings, theorem application with its hypotheses) instead of one string; the UI
  renders steps through `MathText`. Theorem steps carry hypotheses explicitly (Integral
  Test: positive, continuous, decreasing; then evaluate; then conclude).
- **Rendered input preview.** Show the parser's interpretation of the current input live
  (MathLive or a KaTeX render of the normalized expression) so grouping and function
  application are visible before submission. Optional math keyboard for θ, √, π.
- **Fact registry.** Move formula-sheet statements into a data file of
  `{ id, statement, hypotheses, conclusion, source, counterexample? }`; sheets render from
  it and `formulaSheets.test.tsx` asserts against the registry. Editorial cross-checks:
  OpenStax Calculus for theorem statements, DLMF for series and special functions.
- **Secondary symbolic layer (prototype only).** Evaluate CortexJS Compute Engine against
  the Phase 1 corpus as a helper for canonical forms and form constraints (factored,
  lowest terms, rationalized). It never decides domain equality. Adopt only if the
  corpus shows concrete wins and bundle growth is acceptable.

---

## Sequencing and dependencies

```
Phase 1 ──► Phase 2 ──► Phase 3
                │
                └──► Phase 4 (can start after 2.1; 4.3 fact registry is independent)
```

Phase 1 is one PR. Phase 2 is two PRs (spec + adapter, then seeded generators + CI sweep).
Phase 3 is three PRs (event log + migration, mastery/scheduler, bank parametrization).
Phase 4 items are independent PRs.

## Risks

- **Migration of stored progress** (Phase 3) is the only user-visible data change; ship
  with a reversible migration and a test that round-trips existing fixtures.
- **Bundle size** if a second symbolic library is adopted; gate on the research harness
  bundle check and lazy-load anything above the current chunk.
- **Over-strictness regressions**: every tightening in Phases 1–2 must add accept-side tests
  for legitimate alternative forms, not only reject-side tests.

## Definition of done for the whole plan

Every problem states its mathematical object, equality relation, domain, tolerance and
form; every key is verified by an independent computation on thousands of seeds; every
formula statement carries its hypotheses and is tested; and "mastered" requires
first-attempt success across distinct templates plus a passed delayed review.
