# Adversarial Code Review — Math Mastery

**Date:** 2026-07-16 · **Scope:** entire repository at `e69343c` · **Baseline:** `tsc --noEmit` clean, all 154 tests passing

## Methodology

A multi-agent adversarial review: 16 independent review lenses (math correctness across five sections of `mathService.ts`, answer validation, React/state, formula-sheet content ×2, security/robustness, empirical fuzzing, test quality, plus 4 gap-analysis lenses) produced 58 raw findings. Every finding was then attacked by an adversarial verifier whose default stance was *the finding is wrong*, using scratch vitest probes against the real code wherever feasible. Findings that could not be demonstrated were refuted and are listed in the appendix — including a claimed infinite loop and a claimed mathjs DoS that did **not** survive verification.

**Result: 38 confirmed defects** (4 high, 19 medium, 15 low), 6 claims refuted.

The dominant theme: **the app very often marks correct answers wrong.** The math *generation* is mostly right (a previous review fixed the worst of that); what's broken now is the contract between what the problem displays, what a student can physically type, and what `validateAnswer` accepts.

---

## High severity

### H1. Half of all inequality problems are unanswerable from a keyboard
`services/mathService.ts:409-419`, `services/mathService.ts:2439`

`generateInequalitiesProblem` picks its operator from `['<', '>', '≤', '≥']` and stores the answer as a Unicode string (`x ≤ 4`). The answer box is a plain text input with no symbol palette, and `normalizeExpr` never maps ASCII `<=`/`>=` to `≤`/`≥`. The flipped-inequality check can't rescue it (it requires swapped sides), `acceptableAnswers` is unset, and the mathjs fallback throws on `≤`. **Empirically verified: 60/60 generated ≤/≥ problems rejected `x <= 4`; the "correct answer" feedback then displays a string the student still cannot type.** Streaks and mastery for this topic are systematically corrupted.

*Fix:* normalize `<=` → `≤` and `>=` → `≥` in `normalizeExpr` (or store ASCII and render Unicode only in display text).

### H2. Lagrange error-bound problem: the official answer is mathematically wrong
`services/mathService.ts:1959`

The Taylor/Maclaurin error-bound problem's designated answer **0.0026 is not a valid error bound** — the actual error is ≈0.00289, which exceeds it — while the correct Lagrange bound (≈0.0043) is rejected. A student who does the computation correctly is marked wrong; a student who accepts the app's answer learns a false bound. This is the exact class of bug (static wrong answer in a hand-authored problem bank) that the previous review fixed elsewhere.

### H3. Timer expiry automatically fails the *next* problem too
`components/PracticeSession.tsx:118-134`

When the timer expires, `timerRemaining` is 0 and stays 0 while the student clicks "Next Question." On the commit that shows the fresh problem, the timer-start effect (line 101) and the expiry effect (line 118) run in the same pass — the expiry effect still sees `timerRemaining === 0` with the new `answerStatus === 'idle'` and new problem, and instantly marks it incorrect, records an attempt, and resets the streak. **One phantom failure per expiry**, empirically reproduced. With the timer on, every timeout costs the student two failures.

*Fix:* reset `timerRemaining` synchronously in `generateNewProblem`, or key the expiry effect to an explicit `expired` flag rather than the raw countdown value.

### H4. Corrupted-but-valid-JSON localStorage bricks the app on every load
`hooks/useLocalStorage.ts:8`, `contexts/SettingsContext.tsx:16-24`

`useLocalStorage` catches JSON *parse* errors, but a value that parses to the wrong shape flows straight through. If `userSettings` contains e.g. `5` or `"dark"` (valid JSON, not an object), `deepMergeSettings` executes `key in stored`, which throws `TypeError: Cannot use 'in' operator...` on a primitive — during render, on every load, with no recovery path except manually clearing site data. The same class of failure applies to a malformed `userProgress` (e.g. `topicProgress` missing → property reads on `undefined` in `App.tsx`/`StatsDisplay`).

*Fix:* validate shape after parse (fall back to `initialValue`), and/or wrap the merge in a guard that discards non-object stored values.

---

## Medium severity

### Answer grading — correct answers marked wrong

**M1. `allowNegatives: false` is violated whenever the range's max is negative.** `services/mathService.ts:120,136,152,168` clamp only `min` to ≥0 (≥1 for division), leaving `max` unclamped, and `SettingsPanel.tsx:134` happily stores `{min:-10, max:-5}` (max only has to exceed min+1). `randInt(min>max)` then emits values below min. Empirically: 500/500 addition problems with that range + negatives off contained negative operands. The parental "no negatives" toggle silently does nothing.

**M2. Subtraction ignores `allowNegatives` in its *answer*.** `services/mathService.ts:135-149` clamps the operands but draws `a` and `b` independently, so `a − b < 0` ~45% of the time. "No negatives" mode routinely asks 3 − 9.

**M3. Rounded display vs. exact grading — inverse trig.** `services/mathService.ts:1259`: the problem displays a rounded 4-decimal value but grades against the exact integer angle of the *unrounded* value; the true answer to the expression actually displayed is rejected.

**M4. Rounded display vs. exact grading — trig equations.** `services/mathService.ts:1234`: shows a 3-decimal RHS but only accepts the special angle solving the *exact* equation; the precise solution of the displayed equation is wrong.

**M5. Trig ratios reject the canonical fraction form.** `services/mathService.ts:1024`: sin/cos/tan of a right triangle graded numerically, so the natural answer "3/5" cannot be entered (and see M8 — the number input mangles it).

**M6. Fraction-valued answers can't be typed and there's no format instruction.** `services/mathService.ts:1761` (series sums, improper integrals) and the parametric dy/dx generator produce answers like 3/2 or 4.5 behind `<input type="number">`. Typing `3/2` is silently mangled by the browser (becomes `32` → wrong, with no hint why). Nothing tells the student to answer in decimal form.

**M7. Trig substitution rejects equivalent correct answers.** `services/mathService.ts:2214`: a different dummy variable (`x = 2sin(t)`), the equally valid `x = 2cos(θ)`, or omitting the `x=` prefix are all marked wrong.

**M8. The algebraic-equivalence fallback is disabled exactly where it's needed.** `services/mathService.ts:1401,1415`: canonical answers for integration-by-parts/trig integrals are stored in mathjs-*unparseable* notation (`xsin(x)`, `sin^2(x)`), so `expressionsAlgebraicallyEqual` throws and standard equivalent answers outside the hand-listed alternates are rejected.

**M9. The equivalence fallback also accepts wrong answers.** `services/mathService.ts:76`: the numeric spot-check uses an **absolute** ±0.001 tolerance at 6 fixed points; constant-valued wrong answers within 0.001 (or expressions that happen to agree at those points) grade as correct.

**M10. Circle "diameter" questions accept wrong answers.** `services/mathService.ts:763`: the blanket 0.5 tolerance (meant for π rounding) applies to exact-integer diameter answers, so 19.6 is "correct" for 20.

### Wrong or broken math displayed to students

**M11. Horizontal-asymptote rule renders a fraction with an empty denominator.** `components/PreCalculusFormulaSheet.tsx:97`: `\frac{\text{leading coefficients}}{}` — the deg(num)=deg(den) rule displays as visibly broken KaTeX instead of "ratio of leading coefficients."

**M12. ln(1+x) Maclaurin interval is wrong.** `components/Calc2FormulaSheet.tsx:160` states `|x| ≤ 1`; at x = −1 the series is the negative harmonic series and diverges. Correct: −1 < x ≤ 1.

**M13. arctan(5/0) presented as valid math.** `services/mathService.ts:2076`: the rect→polar explanation for points on the y-axis renders a division by zero as a legitimate step.

**M14. Partial-fractions problem prints its own answer.** `services/mathService.ts:1509`: the "What is A?" prompt includes the completed decomposition containing the exact value of A.

### Application logic

**M15. Two contradictory definitions of "mastered."** `App.tsx:53-57` derives mastery from `correct >= masteryThreshold` (deliberately, per its comment) for unlock gating; `TopicSelector.tsx:28` renders the badge from the *persisted* `mastery` boolean. Change the threshold and the UI shows "Mastered" on locked-for-mastery topics (or vice versa).

**M16. Multiplication Tables unlock after mastering division.** `constants.ts:19-29` + `App.tsx:82`: the reference sheet that teaches multiplication sits after `division` in the sequential unlock chain — the students who need it can't reach it.

**M17. The "explanation" feature shows an unanswered LLM prompt.** `components/PracticeSession.tsx:402` renders `explanationPrompt` — literally "Explain step-by-step how to solve 3 + 4." — as the explanation. There is no LLM integration anywhere in the codebase (the footer's "Powered by Gemini" is vestigial). Worse, several prompts (`mathService.ts:1647,1663,2058,2076,2096`) embed `$...$` LaTeX that renders as raw backslash text since line 402 doesn't use `MathText`.

**M18. One-click progress wipe.** `SettingsPanel.tsx:164-191`: the reset flow arms on first click, but `isOpen=false` renders null *without unmounting*, so the armed state survives closing the panel. Reopen settings days later, one accidental click on "Reset Progress" destroys everything with no confirmation.

**M19. Vacuous division-by-zero test.** `services/mathService.test.ts:303`: asserts problem text doesn't match `/÷\s*0/`, but problem text uses LaTeX `\div`, never the `÷` glyph — the assertion cannot fail, providing false confidence on the one invariant it exists to protect.

---

## Low severity

| # | Location | Defect |
|---|----------|--------|
| L1 | `mathService.ts:163` | Multiplication hint claims "a positive times a negative gives a negative" when an operand is 0 (answer is 0) |
| L2 | `mathService.ts:299` | Decimals hint says "line up the decimal points" on *multiplication* problems, where that strategy is wrong |
| L3 | `mathService.ts:811` | π-tolerance inconsistency: large cylinder/sphere volumes computed with true π are rejected while all other π problems accept them |
| L4 | `mathService.ts:1149` | Chain-rule "what is the coefficient?" is ambiguous when the exponent is 2; the expanded derivative's leading coefficient is rejected |
| L5 | `mathService.ts:1687` | Monotonicity explanation lists terms of (−1)^(n+1)/n instead of the stated (−1)^n/n |
| L6 | `Calc2FormulaSheet.tsx:108` | Integral Test stated with no hypotheses (positive/continuous/decreasing) — false as written |
| L7 | `CalculusFormulaSheet.tsx:243` | Quotient limit law omits the lim g(x) ≠ 0 condition |
| L8 | `Calc2FormulaSheet.tsx:201` | θ = arctan(y/x) stated without quadrant adjustment |
| L9 | `App.tsx:141-146` | Theme `system` snapshots `matchMedia` once; never reacts to OS theme changes |
| L10 | `PracticeSession.tsx:306-329` | Fraction fields accept decimals/scientific notation that the integer-only validator regex then silently grades wrong |
| L11 | `SettingsPanel.tsx:125,134` | RangeControl clamps/coerces on every keystroke (`parseInt(v) \|\| 0`); clearing a field stores 0, multi-digit entry stores intermediate values |
| L12 | `MultiplicationTableView.tsx:63-74` | Module-scope `document.head.appendChild` side effect — crashes any non-DOM import (tests/SSR) |
| L13 | `MultiplicationTableView.tsx:48` | Tables 1–12 selectable but rows render only ×1..×10 — "Table of 12" is missing 12×11 and 12×12 |
| L14 | `mathService.test.ts:468` | Self-validation round-trip is tautological for numeric types and passes even for `Infinity` — would not catch the previously-fixed exponent-overflow class |
| L15 | `mathService.test.ts` | No regression tests for the previously fixed bugs (triangle perimeter, exponent overflow, multi-step sign) and zero coverage of `validateAnswer`'s `acceptableAnswers`/flipped-inequality branches |

---

## Adversarial claims that did NOT survive verification

These were reported by review lenses and then **refuted** — recorded so they don't resurface:

1. **"Division generator infinite-loops when `allowNegatives=false` and `max < 1`"** — refuted empirically: 6,000 generations across `{min:-10,max:-5}`, `{min:-10,max:0}`, `{min:0,max:1}` all terminate. `randInt(1,0)` degenerately returns 1, so `while (b===0)` always exits.
2. **"User input fed to mathjs `evaluate`/`simplify` can freeze the tab (DoS)"** — refuted for the tested vectors: mathjs in number mode returns `Infinity` for `999999!` and `9^9^9^9` in ~2 ms; parser errors on pathological input are caught. Residual risk is negligible for a client-only app.
3. **"Parametric dy/dx rejects exact fraction input"** — refuted at app level: the number input prevents fraction entry and `decimal-tolerance` accepts the decimal form (the missing format instruction is tracked as M6).
4. **"Timer expiry and manual submit double-count the same problem"** — not reproducible: React flushes pending passive effects before dispatching discrete events, closing the claimed race window.
5. **"Whole-number fraction answers require contrived n/1 entry"** — partially refuted: user input is simplified before comparison, so `2/2`, `4/2`, `0/5` all grade correctly; only bare-integer entry is impossible, by UI design.

## Suggested priorities

1. **H1 + H3** — these two silently corrupt scoring during normal use and are small fixes (an operator normalization; a timer reset).
2. **H2, M3, M4, M14** — wrong-math-taught bugs in the problem bank.
3. **H4, M18** — data-loss/bricking paths.
4. **M8 + M9** — the equivalence fallback needs both a parseable canonical form and a relative-tolerance spot check.
5. Formula-sheet corrections (M11–M13, L6–L8) are one-line content edits.
