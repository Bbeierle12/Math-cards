# Secondary symbolic layer: CortexJS Compute Engine evaluation (Phase 4.4)

**Decision: not adopted.** On the Phase 1 corpus, Compute Engine's equivalence
verdicts are wrong in 4 of 9 cases. Its canonical form alone erases a domain
restriction (`x/x` becomes `1`). The form checks it would add are either
already done exactly (lowest terms, evaluated arithmetic) or not required by
any generator (factored, rationalized). It would add 943 KB gzipped to a
397 KB app. Nothing in the grader changes.

## What was evaluated

- `@cortex-js/compute-engine` 0.135.0 (MIT), installed in a scratch
  directory outside the repository and never added to `package.json`.
- Node 22, bundled with the repository's esbuild 0.25.12.
- The plan's question: could it serve as a *helper* for canonical forms and
  form constraints (factored, lowest terms, rationalized), without ever
  deciding domain equality?

## 1. The Phase 1 corpus

"Expected" is the verdict under the grader's rule: two answers are the same
only if they are the same partial function.

| Submission | Reference | Expected | CE canonical form of submission | `isSame` | `isEqual` | `simplify` both, then `isSame` | Our grader |
|---|---|---|---|---|---|---|---|
| `x/x` | `1` | reject | **`1`** | **true** ✗ | **true** ✗ | **true** ✗ | reject ✓ |
| `(x²−1)/(x−1)` | `x+1` | reject | unchanged | false | undefined | **true** ✗ | reject ✓ |
| `√(x²)` | `\|x\|` | accept | unchanged | false | undefined | true ✓ | accept ✓ |
| `√(x²)` | `x` | reject | unchanged | false | undefined | false ✓ | reject ✓ |
| `ln(x²)` | `2 ln x` | reject | unchanged | false | undefined | false ✓ (`2 ln\|x\|`) | reject ✓ |
| `ln(cos x)` | `ln\|cos x\|` | reject | unchanged | false | undefined | false ✓ | reject ✓ |
| `tan x` | `sin x / cos x` | accept | unchanged | false | undefined | **false** ✗ | accept ✓ |
| `1/(x−1)` | `(x+1)/(x²−1)` | reject | unchanged | false | undefined | **true** ✗ | reject ✓ |
| `sin²x + cos²x` | `1` | accept | unchanged | false | undefined | true ✓ | accept ✓ |

- `simplify` then `isSame` gets 5 of 9 right. The four errors are three
  removed holes (`x/x`, `(x²−1)/(x−1)`, `1/(x−1)`) and one missed identity
  (`tan`).
- `isEqual` returns `undefined` (undecided) in 8 of 9 cases. The one case it
  does decide, `x/x` = `1`, is wrong.
- The canonical form is not neutral. `ce.parse('\frac{x}{x}')` is already
  `1`, so no check that runs after canonicalisation can see the hole.

This confirms the plan's constraint: Compute Engine may never decide domain
equality. It also shows it cannot safely *pre-process* an answer before our
checker sees it, because canonicalisation changes the function.

## 2. Form constraints

Parsing with `{ canonical: false }` keeps the typed structure. For example,
`\frac{2}{4}` becomes `["Divide", 2, 4]` and `7+5` becomes `["Add", 7, 5]`.

| Constraint | CE capability | What we have today |
|---|---|---|
| Lowest terms | Raw `Divide` of two integers, compared with the canonical rational | `fraction` spec with `lowestTerms`: exact BigInt gcd (`grade.ts`) |
| Evaluated (no restated arithmetic) | Raw `Add`/`Multiply` of literals | `form: 'evaluated'`: mathjs AST check `restatesArithmetic` (`numeric.ts`) |
| Factored | `["Factor", …]` gives `(x−1)(x+2)` for `x²+x−2`. A "factored" check would be: the raw form is a product of non-constant factors, and its expansion equals the reference. | No generator asks for a factored expression (the factoring topic asks for a constant). If one is added, the same check is a few lines with mathjs and our exact polynomial module (`polynomial.ts`). |
| Rationalized denominator | The canonical form rationalises automatically (`1/√2` becomes `√2/2`). Detection needs the raw form (a `Sqrt` under `Divide`). | No generator requires it. The same raw-structure test works on the mathjs AST. |

Every form check Compute Engine enables reads the *raw* parse tree, which
mathjs already gives us. Its symbolic power (`Factor`, `Expand`) is only
needed to produce a target, and our generators already know their targets
exactly.

## 3. Cost

| | Minified | Gzipped |
|---|---|---|
| Compute Engine, minimal import (`ComputeEngine`, `parse`, `simplify`, `Factor`) | 3,294 KB | 943 KB |
| mathjs, same kind of minimal import (for scale) | 668 KB | 190 KB |
| The whole current app (`dist/assets/index-*.js`) | 1,403 KB | 397 KB |

Load and initialisation in Node: dynamic import about 150 ms, then
`new ComputeEngine()` about 100 ms, then first `simplify` about 47 ms and
about 1.7 ms per `simplify` after that. Lazy loading would keep this off the
first render, but a grading decision could not wait on it.

## Conclusion

The plan's adoption test was: "Adopt only if the corpus shows concrete wins and
bundle growth is acceptable." Neither condition holds:

- **No concrete wins.** Its equivalence verdicts are worse than the grader's
  on this corpus (5 of 9 against 9 of 9). Its canonical form destroys the
  domain information the grader depends on. Its form helpers duplicate what
  the mathjs AST and the exact rational and polynomial modules already do.
- **Bundle growth is not acceptable.** It would add 943 KB gzipped, about
  2.4 times the whole current app.

Revisit only if a generator needs a form that genuinely requires symbolic
rewriting (for example "simplify this rational expression completely"), and
then as a lazy-loaded, display-only helper that never affects a verdict.

## Reproducing

Do this in a scratch directory, not in this repository:

```sh
npm init -y && npm install @cortex-js/compute-engine@0.135.0
node eval.mjs     # script below
```

```js
import { ComputeEngine } from '@cortex-js/compute-engine';
const ce = new ComputeEngine();
const CORPUS = [
  ['\\frac{x}{x}', '1'], ['\\frac{x^2-1}{x-1}', 'x+1'], ['\\sqrt{x^2}', '|x|'], ['\\sqrt{x^2}', 'x'],
  ['\\ln(x^2)', '2\\ln(x)'], ['\\ln(\\cos(x))', '\\ln(|\\cos(x)|)'], ['\\tan(x)', '\\frac{\\sin(x)}{\\cos(x)}'],
  ['\\frac{1}{x-1}', '\\frac{x+1}{x^2-1}'], ['\\sin(x)^2+\\cos(x)^2', '1'],
];
for (const [a, b] of CORPUS) {
  const A = ce.parse(a), B = ce.parse(b);
  console.log(a, '|', b, '| canonical', A.latex, '| isSame', A.isSame(B), '| isEqual', A.isEqual(B),
    '| simplified isSame', A.simplify().isSame(B.simplify()));
}
for (const t of ['\\frac{2}{4}', '7+5', '(x-1)(x+2)', '\\frac{1}{\\sqrt{2}}', 'x^2+x-2']) {
  const raw = ce.parse(t, { canonical: false });
  console.log(t, JSON.stringify(raw.json), '| canonical', ce.parse(t).latex,
    '| Factor', ce.box(['Factor', raw]).evaluate().latex);
}
```
