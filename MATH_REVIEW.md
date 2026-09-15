# Math Accuracy Review — Math Mastery

**Date:** 2026-09-14 · **Scope:** entire repository at `0629b60`, focused on the mathematics of problem generation and grading in `services/mathService.ts`, plus the formula-sheet reference content · **Baseline:** `tsc --noEmit` clean, 163/163 tests passing

## Methodology

1. Full line-by-line read of every generator and of `validateAnswer` / `expressionsAlgebraicallyEqual`, checking each answer key by hand against the displayed problem.
2. An empirical probe (vitest, deleted after the run) against the real code:
   - 2,000 generations × 10 parametric generators re-solved from the *displayed* text (systems, inequalities, radicals, exponents, trig ratios, Pythagorean, fractions, angles, triangles, area/perimeter): **0 answer-key violations**.
   - 32,127 `$...$` segments from problem text and hints rendered through KaTeX 0.16.38 with `throwOnError` and strict mode: **0 errors, 0 warnings**.
   - Grading probes: for each expression-type problem bank, a list of mathematically correct answers a student would plausibly type, plus clearly wrong neighbours, run through `validateAnswer`.
   - Settings probes: 500–1,000 generations per arithmetic topic with `allowNegatives=false` and various ranges.
3. A separate audit of all seven formula sheets, the unit circle and the multiplication table (all 128 formula strings KaTeX-checked, every unit-circle value recomputed).
4. Every item from the July 2026 `ADVERSARIAL_REVIEW.md` re-checked for current status.

**Headline:** the *computed* mathematics is sound — no generator produces a wrong key for a randomly generated problem. The defects are concentrated in (a) one hand-authored answer key that is mathematically false, (b) two prompts that print their own answer, (c) the grading contract for Calc 2 expression answers, which still rejects standard correct forms, and (d) reference-sheet statements that are false or missing hypotheses. Of the 38 defects in the July review, only three were fixed (H1, M10, surface-area tolerance); the rest are still present and are listed with current line numbers below.

---

## HIGH — wrong mathematics presented to the student

### H1. Lagrange error-bound answer key is not a bound *(July H2, still open)*
`services/mathService.ts:1972-1975`

Problem: "estimate the max error when approximating $e^x$ by its 3rd-degree Maclaurin polynomial at $x = 0.5$." Stored answer `0.0026`, alternates `0.003`, `1/384`.

| Quantity | Value |
|---|---|
| Actual error, e^0.5 − P₃(0.5) | 0.002888 |
| Lagrange bound with M = e^0.5 (correct) | 0.004294 |
| App's key (uses M = 1) | 0.002604 |

The key is *smaller than the actual error*, so it is not an error bound at all. M must be max |f⁽⁴⁾(c)| on [0, 0.5] = e^0.5, not 1. Verified: `validateAnswer` rejects `0.0043` and, by accident of the ±0.001 absolute tolerance (see M4), accepts `0.0029`. The explanation string even computes 0.0043 and then labels 0.0026 a "crude bound".

*Fix:* answer `0.0043`, alternates `0.004`, `e^0.5/384`, `0.00429`; drop the "M=1" sentence.

### H2. Two prompts print their own answer
- `services/mathService.ts:1523` (partial fractions, *July M14, still open*): "What is $A$? (as a fraction like $\frac{1}{8}$)" — the example is generated from `diff`, which **is** the answer `1/8`. Verified on generated output.
- `services/mathService.ts:1609` (improper integrals, **new**): "converges when $p$ is ___? (Enter an inequality like $p > 1$)" — the stored answer is `p>1`.

*Fix:* use a fixed, unrelated example (`\frac{1}{7}`, `q < 3`).

### H3. Formula-sheet statements that are false as written
- `components/Calc2FormulaSheet.tsx:160` — `ln(1+x) = Σ (−1)^{n+1} xⁿ/n, |x| ≤ 1`. At x = −1 this is −Σ1/n, which diverges. Correct interval: **−1 < x ≤ 1**.
- `components/Calc2FormulaSheet.tsx:201` — `θ = arctan(y/x)` stated unconditionally. Wrong quadrant for every x < 0 (e.g. (−1, 1) → −π/4 instead of 3π/4) and undefined at x = 0. State `tan θ = y/x` with θ in the quadrant of (x, y), or add π when x < 0.

---

## MEDIUM — correct answers rejected, wrong answers accepted, or misleading content

### M1. Calc 2 canonical answers are not mathjs-parseable, so standard correct forms are rejected *(July M8, still open)*
`services/mathService.ts:1415,1422,1429,1436` (integration by parts) and `:1475,1482,1489` (trig integrals)

Stored keys like `xe^x-e^x`, `xsin(x)+cos(x)`, `sin^2(x)/2`, `tan^2(x)/2` cannot be parsed by mathjs (`xe` is read as a single symbol; `sin^2(x)` as `sin^2·x`). Because the algebraic-equivalence fallback throws on the *key*, only the hand-listed alternates ever match. Verified rejections of correct answers:

| Problem | Correct answer typed | Result |
|---|---|---|
| ∫ x eˣ dx | `e^x*(x-1)`, `e^x*x - e^x`, `-e^x + x*e^x` | rejected |
| ∫ x cos x dx | `cos(x)+x*sin(x)` | rejected |
| ∫ x sin x dx | `sin(x)-x*cos(x)`, `sin x - x cos x` | rejected |
| ∫ ln x dx | `x*(ln(x)-1)`, `-x+x*ln(x)`, `x*log(x)-x` | rejected |
| ∫ sin x cos x dx | `(sin(x))^2/2`, `1/2*sin(x)^2`, `-cos(x)^2/2`, `-(cos(2x))/4` | rejected |
| ∫ sec²x tan x dx | `(tan(x))^2/2`, `1/2*tan(x)^2`, `sec(x)^2/2` | rejected |
| ∫ tan x dx | `-ln(cos x)`, `ln(sec x)`, `-ln(abs(cos(x)))` | rejected |

By contrast `∫ sin²x dx` (key `x/2-sin(2x)/4`, which *is* parseable) accepted all seven correct variants tried, including `x/2-sin(x)cos(x)/2`. That is the target behaviour.

*Fix:* store keys in mathjs syntax (`x*e^x-e^x`, `sin(x)^2/2`, `-log(abs(cos(x)))`), keep the pretty form for display only, and normalise `ln`→`log`, `|…|`→`abs(…)` (already done) before comparison. Antiderivatives differing by a constant (`sec²/2` vs `tan²/2`) need a derivative-based or constant-offset check.

### M2. `allowNegatives: false` is not honoured *(July M1 + M2, still open)*
`services/mathService.ts:120-123,136-139,152-155,168-169`

Only `min` is clamped; `max` is not, and subtraction draws `a`, `b` independently.

| Setting | Result (probe) |
|---|---|
| range [−10, −5], negatives off — addition/subtraction/multiplication/division | 500/500 problems contain a negative operand |
| range [0, 10], negatives off — subtraction | 476/1000 answers are negative (e.g. 3 − 9) |

`SettingsPanel.tsx:134` lets `max` be stored negative, so this is reachable from the UI. *Fix:* clamp `max` to ≥ `min` after clamping `min`; for subtraction with negatives off, swap so `a ≥ b`.

### M3. Decimals: ±0.01 tolerance on keys that are exact to 2 dp *(new)*
`services/mathService.ts:295-298`

Every decimals answer has at most two decimal places and is exact, yet grading uses `decimal-tolerance` 0.01. Verified: for 2.3 × 4.7 = 10.81 the inputs `10.80`, `10.82` and `10.8` are all accepted; for 0.3 × 0.7 = 0.21, `0.2` is accepted. The topic exists to teach the hundredths digit and does not check it. *Fix:* `numeric` grading (compare `Math.round(x*100)` values), or tolerance 0.001.

### M4. Equivalence fallback uses an absolute 0.001 tolerance *(July M9, still open)*
`services/mathService.ts:66-76`

Six fixed sample points, absolute ±0.001. Verified: `0.5009` is accepted for `1/2`; `0.0029` is accepted for `0.0026` (a 12 % error). For small-magnitude keys the check is meaningless. *Fix:* relative tolerance (`|u−c| ≤ 1e-6·max(1,|c|)`) and randomised sample points.

### M5. Displayed value is rounded; grading demands the exact special angle *(July M3 + M4, still open)*
`services/mathService.ts:1250` (trig equations), `:1274` (inverse trig)

"Evaluate sin⁻¹(0.866) in degrees" — the precise answer to the displayed problem is 59.997°, which is rejected; only `60` passes. Same for `cos θ = 0.866` etc. Either display exact values (`\frac{\sqrt{3}}{2}`) and keep exact grading, or keep the decimal and grade with tolerance ±0.5°.

### M6. Fraction-natural keys sit behind `<input type="number">` with no format instruction *(July M5 + M6, still open)*
`components/PracticeSession.tsx:333`; keys at `mathService.ts:1038` (trig ratios 3/5, 5/12…), `:1780` (Σ(1/3)ⁿ = 3/2), `:1599` (∫x⁻³ = 1/2), `:2034` (dy/dx = 9/2)

A number input silently discards `/`, so the canonical fraction form cannot be entered and nothing tells the student to convert to decimal. *Fix:* use a text input for these topics and accept `a/b` via the existing mathjs path, or add "(as a decimal)" to the prompt.

### M7. The "explanation" shown on a wrong answer is the LLM prompt string, and some of it is wrong *(July M17, M13, L5, still open)*
`components/PracticeSession.tsx:402` renders `explanationPrompt` verbatim, without `MathText`.

- Most topics show text like "Explain step-by-step how to solve 3 + 4." as the explanation (no LLM is wired up; the "Powered by Gemini" footer is vestigial).
- `mathService.ts:1701` — for aₙ = (−1)ⁿ/n the explanation lists the terms as "1, −1/2, 1/3, −1/4"; the actual terms are −1, 1/2, −1/3, 1/4.
- `mathService.ts:2090` — for the point (0, 5) the explanation shows `arctan(5/0) = 90°`, presenting division by zero as a step.
- `exponents`, `sequences`, `polar-coordinates` explanations contain `$…$` LaTeX that is displayed as raw backslashes (verified on generated output).

### M8. Static banks are smaller than the mastery threshold *(new, design)*
Mastery requires 10 correct answers; these topics draw uniformly from tiny fixed lists, so "mastery" means memorising the bank: integration-by-parts **4** problems, trig-substitution **4**, trig-integrals **5**, improper-integrals **5**, power-series **5**, trig-identities **5**, taylor-maclaurin **7**, inverse-trig **7**, series-convergence **9**, trig-special-angles **9**, trig-equations **9**. Every other topic is parametric.

### M9. Formula-sheet statements missing hypotheses (reads as false)
- `components/PreCalculusFormulaSheet.tsx:97` — `\frac{\text{leading coefficients}}{}` renders with an empty denominator *(July M11, still open)*. Use `\frac{a_n}{b_m}`.
- `components/PreCalculusFormulaSheet.tsx:98` — "deg(num) > deg(den): no HA (oblique asymptote)". An oblique asymptote exists only when deg(num) = deg(den) + 1.
- `components/Calc2FormulaSheet.tsx:108` — Integral Test with no hypotheses *(July L6)*. Counterexample as stated: f(x) = sin²(πx). Needs positive, continuous, decreasing.
- `components/CalculusFormulaSheet.tsx:243` — quotient limit law without lim g(x) ≠ 0 *(July L7)*.
- `components/Calc2FormulaSheet.tsx:164` — arctan series without its interval |x| ≤ 1, while the neighbouring rows state theirs.
- `components/PreCalculusFormulaSheet.tsx:144` — ellipse `c² = a² − b²` is only valid for a > b; for a vertical ellipse it gives c² < 0.
- `components/Algebra2FormulaSheet.tsx:60,64` — `√(ab) = √a·√b` with no a, b ≥ 0, on the same sheet that defines i = √−1 (applied to negatives it "proves" 1 = −1).

---

## LOW

| # | Location | Defect |
|---|---|---|
| L1 | `mathService.ts:858-860` | π tolerance ±0.5 is too tight for large cylinder/sphere volumes: **222 of 1,455** π-based volume/surface-area problems reject the true-π answer (r = 7, h = 12 cylinder: key 1846.32 vs true 1847.26). The text does say "Use π ≈ 3.14", so this is defensible but inconsistent with circles/area-perimeter, which accept true π in 479/479 cases. *(July L3)* |
| L2 | `mathService.ts:2223-2250` | Trig substitution rejects `2sin(θ)` (no `x=`) and `x=2sin(t)`. *(July M7)* |
| L3 | generators at `:383, :477, :510, :532, :881, :1323, :1342, :1374, :2000` | Display artifacts: `3x - 9 = 1x + 1`, `(1x^2 + 8x + 8)`, `x^2 + 0x - 36`, `(0 - 5i)`, `- 1i`, `\frac{1}{x -0}`, `(y-0)^2`, `x^2 - 2x + 0 = 0`, `y = t^2 + 0`. All mathematically valid, all unprofessional; `x -0` is confusing. Use `latexSignedCoeff`/`latexTerm` helpers consistently and suppress zero terms. |
| L4 | `mathService.ts:163` | Multiplication hint says "a positive times a negative gives a negative" when one operand is 0. *(July L1)* |
| L5 | `mathService.ts:299` | Decimals hint "line up the decimal points" is shown on multiplication problems, where that method is wrong. *(July L2)* |
| L6 | `mathService.ts:421` | Inequalities hint warns to flip the sign when dividing by a negative, but `a ∈ [2,5]` so it never applies; students may flip anyway. |
| L7 | `mathService.ts:1579` | "Evaluate (enter a number or "diverges")" on a `numeric` problem — the number input cannot accept "diverges". |
| L8 | `mathService.ts:268-300` + `constants.ts` | Decimals (Pre-Algebra topic 3) produces negative answers (e.g. 2.3 − 7.8) before the Integers topic (topic 5) introduces negatives. Draw `a ≥ b` for subtraction. |
| L9 | `mathService.ts:1152-1169` | Chain-rule "What is the coefficient?" is ambiguous when the outer exponent is 2 (expanded form has a different leading coefficient). *(July L4)* |
| L10 | `mathService.ts:2` | `SPECIAL_ANGLES` imported and never used. |
| L11 | `mathService.ts:2512-2525`, `types.ts` | `coordinate` and `multiple-choice` answer types are implemented and unit-tested but no generator produces them. |
| L12 | `components/MultiplicationTableView.tsx:12,48` | Tables 1–12 selectable, rows only ×1…×10. *(July L13)* |
| L13 | Formula sheets | Standard-but-missing conditions: `a^0 = 1` and `a^{-n}` need a ≠ 0 (`Algebra1FormulaSheet.tsx:68,72`); finite geometric sum needs r ≠ 1 (`Algebra2FormulaSheet.tsx:122`, `Calc2FormulaSheet.tsx:240`); `Σarⁿ = a/(1−r)` needs the index to start at n = 0 (`Calc2FormulaSheet.tsx:81`); sector area lacks "(radians)" (`GeometryFormulaSheet.tsx:80`); Rational Root Theorem needs "integer coefficients, p/q in lowest terms" (`PreCalculusFormulaSheet.tsx:73`); FTC omits "f continuous" (`CalculusFormulaSheet.tsx:211,216`); undefined symbols a, p, l on the geometry sheet (`:53,126`). |

---

## Verified correct

- **All parametric generators** (arithmetic, linear/multi-step equations, inequalities, systems, exponents, polynomials, factoring, quadratics, angles, triangles, Pythagorean, area/perimeter, circles, volume, complex, radicals, logs, sequences, trig ratios, functions, roots, asymptotes, growth, conics, limits, power/product/quotient/chain rules, basic integrals, u-substitution, partial fractions, sequences, parametric, polar conversions, disk/washer/shell/arc-length/surface-area): every key re-derived from the displayed text matched.
- **Static Calc 2 banks**: every IBP, trig-integral, improper-integral, series, power-series, Maclaurin and trig-substitution key other than H1 is correct (∫₁^∞x⁻³ = ½, 2π/15 washer, R = 2 for Σxⁿ/2ⁿ, alternating-series bound 1/5, π/4 quarter circle, etc.).
- **Radical simplification** is always complete (multiplier is prime; verified 2,000 runs).
- **Systems** are never singular; **triangle** sides always satisfy the triangle inequality; **triangle angles** always positive; **fractions** never have a zero denominator and are always fully reduced with a positive denominator.
- **Grading**: the ASCII `<=`/`>=` fix (July H1) works, including flipped sides and wrong-direction rejection; diameter grades exactly (July M10). Taylor-series answers accept reordered terms, `x^2/2!` factorial notation, decimal coefficients and parenthesised forms; the eliminate-parameter problem accepts the expanded quadratic.
- **Unit circle**: all 16 rows (sin, cos, tan, radians) exact, `undefined` at 90°/270°, SVG quadrant placement correct.
- **Rendering**: 32,127 generated LaTeX segments and all 128 formula-sheet strings render without KaTeX errors or strict-mode warnings.

## Hypotheses tested and refuted

1. *"The mathjs fallback accepts a wrong inequality bound (e.g. `x<7` for `x<9`) because all six sample points are below 7."* **Refuted.** mathjs returns booleans for relational expressions and the spot-check only counts numeric results; `simplify((x<7)-(x<9))` does not reduce to 0. Verified rejections: `x<7` vs `x<9`, `x>2` vs `x>5`, `p>2` vs `p>1`, `p>=1` vs `p>1`.
2. *"Some generated LaTeX fails to render."* **Refuted** (0 errors in 32,127 segments).
3. *"Division can divide by zero or loop forever with negatives off."* **Refuted** (the existing guard and `randInt(1,0) = 1` degenerate case both hold).

## Status of the July 2026 review

| Fixed | Still open |
|---|---|
| H1 (ASCII ≤/≥), M10 (diameter tolerance), surface-area tolerance | H2, H3, H4, M1–M9, M11–M19, L1–L15 |

H3 (timer expiry fails the next problem too), H4 (non-object localStorage value throws in `deepMergeSettings`), M15, M16, M18 and L9–L12 were re-checked by code inspection only (no DOM test environment is installed); the code paths described in July are unchanged.

## Suggested fix order

1. **H1, H2** — three one-line content edits that stop teaching wrong maths / giving away answers.
2. **M1** — rewrite the IBP and trig-integral keys in mathjs syntax; this is what unlocks the equivalence checker for the whole Calc 2 section. Add a regression test that runs the "standard forms" table above.
3. **M2, M3, M4** — grading precision: clamp `max`, exact decimals, relative tolerance.
4. **H3, M9** — formula-sheet edits (each is a one-line change).
5. **M5, M6, M7** — display/answer-format contract; M7 should either render `explanationPrompt` through `MathText` and rewrite the "Explain…" prompts as actual explanations, or hide the feature.
6. **M8** — parametrise the Calc 2 banks (e.g. `∫ x eᵃˣ dx`, `∫ xⁿ ln x dx`, `√(a² − x²)` with random a) so mastery reflects skill.
