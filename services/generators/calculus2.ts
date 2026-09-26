/**
 * Calculus 2.
 *
 * Several topics are still fixed banks of items; each item is its own
 * template. (Parametrizing them is Phase 3 of docs/PLAN.md.)
 */
import type { AnswerSpec, TopicId } from '../../types';
import type { Draft, GenContext, GeneratorDef } from './context';
import { choice, degrees, exact, latexFrac, ordinalSuffix, roundedTo, words } from './context';

interface BankItem {
  id: string;
  text: string;
  answer: AnswerSpec;
  display?: string;
  hint: string;
  explanation: string;
}

const fromBank = (ctx: GenContext, items: BankItem[]): Draft => {
  const item = ctx.pick(items);
  return {
    templateId: item.id,
    problemText: item.text,
    answer: item.answer,
    displayAnswer: item.display,
    explanation: item.explanation,
    hint: item.hint,
  };
};

const bank = (topicId: TopicId, version: number, items: BankItem[]): GeneratorDef => ({
  topicId,
  version,
  generate: (ctx) => fromBank(ctx, items),
});

/**
 * An indefinite integral. A submission is graded by differentiating it and
 * comparing with the integrand on the integrand's domain; `reference` is an
 * independent second vote.
 */
const antiderivative = (integrand: string, reference: string): AnswerSpec =>
  ({ kind: 'antiderivative', integrand, variable: 'x', reference });

const convergeVerdict = (verdict: 'converges' | 'diverges'): AnswerSpec => choice(['converges', 'diverges'], verdict);

export const integrationByParts = bank('integration-by-parts', 2, [
  {
    id: 'x*e^x',
    text: '$\\displaystyle\\int x \\cdot e^x\\,dx$\nWhat is the result? (omit $+C$)',
    answer: antiderivative('x*e^x', 'x*e^x-e^x'),
    display: '$xe^x - e^x + C$',
    hint: 'Let $u = x$, $dv = e^x\\,dx$. Then $du = dx$, $v = e^x$.',
    explanation: 'With $u = x$, $dv = e^x\\,dx$: $uv - \\int v\\,du = xe^x - \\int e^x\\,dx = xe^x - e^x + C$.',
  },
  {
    id: 'x*cos(x)',
    text: '$\\displaystyle\\int x \\cdot \\cos(x)\\,dx$\nWhat is the result? (omit $+C$)',
    answer: antiderivative('x*cos(x)', 'x*sin(x)+cos(x)'),
    display: '$x\\sin(x) + \\cos(x) + C$',
    hint: 'Let $u = x$, $dv = \\cos(x)\\,dx$.',
    explanation: 'With $u = x$, $dv = \\cos(x)\\,dx$: $x\\sin(x) - \\int \\sin(x)\\,dx = x\\sin(x) + \\cos(x) + C$.',
  },
  {
    id: 'x*sin(x)',
    text: '$\\displaystyle\\int x \\cdot \\sin(x)\\,dx$\nWhat is the result? (omit $+C$)',
    answer: antiderivative('x*sin(x)', '-x*cos(x)+sin(x)'),
    display: '$-x\\cos(x) + \\sin(x) + C$',
    hint: 'Let $u = x$, $dv = \\sin(x)\\,dx$.',
    explanation: 'With $u = x$, $dv = \\sin(x)\\,dx$: $-x\\cos(x) + \\int \\cos(x)\\,dx = -x\\cos(x) + \\sin(x) + C$.',
  },
  {
    id: 'ln(x)',
    text: '$\\displaystyle\\int \\ln(x)\\,dx$\nWhat is the result? (omit $+C$)',
    answer: antiderivative('log(x)', 'x*log(x)-x'),
    display: '$x\\ln(x) - x + C$',
    hint: 'Let $u = \\ln(x)$, $dv = dx$.',
    explanation: 'With $u = \\ln(x)$, $dv = dx$: $x\\ln(x) - \\int x \\cdot \\frac{1}{x}\\,dx = x\\ln(x) - x + C$.',
  },
]);

export const trigIntegrals = bank('trig-integrals', 2, [
  {
    id: 'sin^2',
    text: '$\\displaystyle\\int \\sin^2(x)\\,dx$\nWhat is the result? (omit $+C$)',
    answer: antiderivative('sin(x)^2', 'x/2-sin(2x)/4'),
    display: '$\\frac{x}{2} - \\frac{\\sin(2x)}{4} + C$',
    hint: 'Use the identity $\\sin^2(x) = \\frac{1 - \\cos(2x)}{2}$',
    explanation: '$\\sin^2(x) = \\frac{1 - \\cos(2x)}{2}$, so $\\int \\sin^2(x)\\,dx = \\frac{x}{2} - \\frac{\\sin(2x)}{4} + C$.',
  },
  {
    id: 'cos^2',
    text: '$\\displaystyle\\int \\cos^2(x)\\,dx$\nWhat is the result? (omit $+C$)',
    answer: antiderivative('cos(x)^2', 'x/2+sin(2x)/4'),
    display: '$\\frac{x}{2} + \\frac{\\sin(2x)}{4} + C$',
    hint: 'Use the identity $\\cos^2(x) = \\frac{1 + \\cos(2x)}{2}$',
    explanation: '$\\cos^2(x) = \\frac{1 + \\cos(2x)}{2}$, so $\\int \\cos^2(x)\\,dx = \\frac{x}{2} + \\frac{\\sin(2x)}{4} + C$.',
  },
  {
    id: 'sin*cos',
    text: '$\\displaystyle\\int \\sin(x)\\cos(x)\\,dx$\nWhat is the result? (omit $+C$)',
    answer: antiderivative('sin(x)*cos(x)', 'sin(x)^2/2'),
    display: '$\\frac{\\sin^2(x)}{2} + C$ (equivalently $-\\frac{\\cos^2(x)}{2} + C$ or $-\\frac{\\cos(2x)}{4} + C$)',
    hint: 'Use $u$-substitution with $u = \\sin(x)$, or the identity $\\sin(2x) = 2\\sin(x)\\cos(x)$',
    explanation: 'Let $u = \\sin(x)$, $du = \\cos(x)\\,dx$: $\\int u\\,du = \\frac{u^2}{2} = \\frac{\\sin^2(x)}{2} + C$. The forms $-\\frac{\\cos^2(x)}{2}$ and $-\\frac{\\cos(2x)}{4}$ differ from this only by a constant.',
  },
  {
    id: 'tan',
    text: '$\\displaystyle\\int \\tan(x)\\,dx$\nWhat is the result? (omit $+C$; use absolute values where needed)',
    answer: antiderivative('tan(x)', '-log(abs(cos(x)))'),
    display: '$-\\ln|\\cos(x)| + C = \\ln|\\sec(x)| + C$',
    hint: 'Rewrite $\\tan(x) = \\frac{\\sin(x)}{\\cos(x)}$ and use substitution.',
    explanation: '$\\int \\frac{\\sin(x)}{\\cos(x)}\\,dx$ with $u = \\cos(x)$, $du = -\\sin(x)\\,dx$ gives $-\\int \\frac{du}{u} = -\\ln|u| = -\\ln|\\cos(x)| + C$. The absolute value is required: $\\cos(x)$ is negative on part of the domain of $\\tan$, where $\\ln(\\cos x)$ is undefined.',
  },
  {
    id: 'sec^2*tan',
    text: '$\\displaystyle\\int \\sec^2(x)\\tan(x)\\,dx$\nWhat is the result? (omit $+C$)',
    answer: antiderivative('sec(x)^2*tan(x)', 'tan(x)^2/2'),
    display: '$\\frac{\\tan^2(x)}{2} + C$ (equivalently $\\frac{\\sec^2(x)}{2} + C$)',
    hint: 'Let $u = \\tan(x)$, then $du = \\sec^2(x)\\,dx$',
    explanation: 'Let $u = \\tan(x)$, $du = \\sec^2(x)\\,dx$: $\\int u\\,du = \\frac{u^2}{2} = \\frac{\\tan^2(x)}{2} + C$. Since $\\sec^2 = 1 + \\tan^2$, $\\frac{\\sec^2(x)}{2}$ differs by the constant $\\frac{1}{2}$.',
  },
]);

export const partialFractions: GeneratorDef = {
  topicId: 'partial-fractions',
  version: 2,
  generate: (ctx) => {
    const template = ctx.pick(['distinct-linear-A', 'distinct-linear-B', 'repeated-linear', 'quadratic'] as const);
    if (template === 'distinct-linear-A' || template === 'distinct-linear-B') {
      // 1/((x − a)(x + c)) = A/(x − a) + B/(x + c): A = 1/(a + c), B = −1/(a + c)
      const a = ctx.int(1, 5);
      const c = ctx.int(1, 5);
      const diff = a + c;
      const setup = `Decompose into partial fractions:\n$\\frac{1}{(x - ${a})(x + ${c})} = \\frac{A}{x - ${a}} + \\frac{B}{x + ${c}}$\n`;
      const cleared = `Multiply through by $(x - ${a})(x + ${c})$: $1 = A(x + ${c}) + B(x - ${a})$.`;
      if (template === 'distinct-linear-A') {
        return {
          templateId: template,
          problemText: `${setup}What is $A$? (enter a fraction)`,
          answer: exact(1 / diff),
          displayAnswer: `$${latexFrac(1, diff)}$`,
          explanation: `${cleared} Set $x = ${a}$: $1 = A(${a} + ${c}) = ${diff}A$, so $A = ${latexFrac(1, diff)}$.`,
          hint: `Multiply both sides by $(x - ${a})$ and set $x = ${a}$.`,
        };
      }
      return {
        templateId: template,
        problemText: `${setup}What is $B$? (enter a fraction)`,
        answer: exact(-1 / diff),
        displayAnswer: `$-${latexFrac(1, diff)}$`,
        explanation: `${cleared} Set $x = -${c}$: $1 = B(-${c} - ${a}) = -${diff}B$, so $B = -${latexFrac(1, diff)}$.`,
        hint: `Multiply both sides by $(x + ${c})$ and set $x = -${c}$.`,
      };
    }
    if (template === 'repeated-linear') {
      // n/(x − a)² = A/(x − a) + B/(x − a)²: n = A(x − a) + B, so B = n and A = 0
      const a = ctx.int(1, 4);
      const n = ctx.int(2, 5);
      return {
        templateId: template,
        problemText: `Decompose: $\\frac{${n}}{(x - ${a})^2} = \\frac{A}{x - ${a}} + \\frac{B}{(x - ${a})^2}$\nWhat is $B$?`,
        answer: exact(n),
        explanation: `Multiply both sides by $(x-${a})^2$: $${n} = A(x-${a}) + B$. Set $x = ${a}$: $B = ${n}$. (Comparing $x$ coefficients gives $A = 0$.)`,
        hint: `Multiply both sides by $(x - ${a})^2$ and set $x = ${a}$.`,
      };
    }
    // 1/((x − a)(x² + 1)) = A/(x − a) + (Bx + C)/(x² + 1): A = 1/(a² + 1)
    const a = ctx.int(1, 3);
    const denom = a * a + 1;
    return {
      templateId: template,
      problemText: `Decompose: $\\frac{1}{(x - ${a})(x^2 + 1)} = \\frac{A}{x - ${a}} + \\frac{Bx + C}{x^2 + 1}$\nWhat is $A$? (enter a fraction)`,
      answer: exact(1 / denom),
      displayAnswer: `$${latexFrac(1, denom)}$`,
      explanation: `Multiply by $(x-${a})$ and set $x = ${a}$: $A = \\frac{1}{${a}^2 + 1} = ${latexFrac(1, denom)}$.`,
      hint: `Multiply both sides by $(x - ${a})$ and set $x = ${a}$.`,
    };
  },
};

export const improperIntegrals = bank('improper-integrals', 2, [
  {
    id: '1/x^2',
    text: '$\\displaystyle\\int_1^{\\infty} \\frac{1}{x^2}\\,dx$\nEvaluate (enter the exact value)',
    answer: exact(1),
    hint: '$\\int x^{-2}\\,dx = -x^{-1}$. Evaluate the limit as $b \\to \\infty$.',
    explanation: '$\\int_1^b x^{-2}\\,dx = \\left[-\\frac{1}{x}\\right]_1^b = 1 - \\frac{1}{b} \\to 1$ as $b \\to \\infty$.',
  },
  {
    id: '1/x',
    text: '$\\displaystyle\\int_1^{\\infty} \\frac{1}{x}\\,dx$\nDoes this converge or diverge?',
    answer: convergeVerdict('diverges'),
    hint: '$\\int \\frac{1}{x}\\,dx = \\ln|x|$. What happens as $x \\to \\infty$?',
    explanation: '$\\int_1^b \\frac{1}{x}\\,dx = \\ln(b) \\to \\infty$ as $b \\to \\infty$, so the integral diverges.',
  },
  {
    id: '1/x^3',
    text: '$\\displaystyle\\int_1^{\\infty} \\frac{1}{x^3}\\,dx$\nEvaluate (enter an exact number or fraction)',
    answer: exact(0.5),
    display: '$\\frac{1}{2}$',
    hint: '$\\int x^{-3}\\,dx = \\frac{x^{-2}}{-2}$. Evaluate the limit.',
    explanation: '$\\int_1^b x^{-3}\\,dx = \\left[-\\frac{1}{2x^2}\\right]_1^b = -\\frac{1}{2b^2} + \\frac{1}{2} \\to \\frac{1}{2}$ as $b \\to \\infty$.',
  },
  {
    id: 'e^-x',
    text: '$\\displaystyle\\int_0^{\\infty} e^{-x}\\,dx$\nEvaluate (enter a number)',
    answer: exact(1),
    hint: '$\\int e^{-x}\\,dx = -e^{-x}$. What is $e^{-x}$ as $x \\to \\infty$?',
    explanation: '$\\int_0^b e^{-x}\\,dx = \\left[-e^{-x}\\right]_0^b = 1 - e^{-b} \\to 1$ as $b \\to \\infty$.',
  },
  {
    id: 'p-integral',
    text: 'For which $p$ does $\\displaystyle\\int_1^{\\infty} \\frac{1}{x^p}\\,dx$ converge?\n(Answer as an inequality in $p$, or in interval notation.)',
    answer: { kind: 'interval', variable: 'p', set: [{ lo: 1, hi: Infinity, loClosed: false, hiClosed: false }] },
    hint: 'Think about the antiderivative $\\frac{x^{1-p}}{1-p}$ and when the limit exists.',
    explanation: 'For $p \\neq 1$, $\\int_1^b x^{-p}\\,dx = \\frac{b^{1-p} - 1}{1-p}$, which has a finite limit exactly when $1 - p < 0$. For $p = 1$ it is $\\ln b \\to \\infty$. So the integral converges when $p > 1$ and diverges when $p \\leq 1$.',
  },
]);

export const sequences: GeneratorDef = {
  topicId: 'sequences',
  version: 2,
  generate: (ctx) => {
    const template = ctx.pick(['arithmetic', 'geometric', 'convergence', 'bounded-monotone'] as const);
    if (template === 'arithmetic') {
      const a1 = ctx.int(1, 10);
      const d = ctx.int(2, 7);
      const n = ctx.int(5, 15);
      const answer = a1 + (n - 1) * d;
      return {
        templateId: 'arithmetic-nth-term',
        problemText: `Find the $${n}$${ordinalSuffix(n)} term of the arithmetic sequence:\n$a_1 = ${a1}$, $d = ${d}$`,
        answer: exact(answer),
        explanation: `Use $a_n = a_1 + (n-1)d = ${a1} + (${n}-1)(${d}) = ${answer}$`,
        hint: 'Formula: $a_n = a_1 + (n-1)d$',
      };
    }
    if (template === 'geometric') {
      const a1 = ctx.int(2, 5);
      const r = ctx.int(2, 3);
      const n = ctx.int(3, 6);
      const answer = a1 * Math.pow(r, n - 1);
      return {
        templateId: 'geometric-nth-term',
        problemText: `Find the $${n}$${ordinalSuffix(n)} term of the geometric sequence:\n$a_1 = ${a1}$, $r = ${r}$`,
        answer: exact(answer),
        explanation: `Use $a_n = a_1 \\cdot r^{n-1} = ${a1} \\cdot ${r}^{${n - 1}} = ${answer}$`,
        hint: 'Formula: $a_n = a_1 \\cdot r^{n-1}$',
      };
    }
    if (template === 'bounded-monotone') {
      if (ctx.pick([true, false, false])) {
        return {
          templateId: 'monotonic-alternating',
          problemText: 'Is the sequence $a_n = (-1)^n \\cdot \\frac{1}{n}$ monotonic?',
          answer: choice(['yes', 'no'], 'no'),
          displayAnswer: 'No',
          explanation: 'Starting at $n = 1$ the terms are $-1, \\frac{1}{2}, -\\frac{1}{3}, \\frac{1}{4}, \\ldots$ — they alternate in sign, so the sequence is neither increasing nor decreasing and the MCT does not apply directly (it still converges to 0).',
          hint: 'Check: does $a_{n+1} \\geq a_n$ always, or $a_{n+1} \\leq a_n$ always?',
        };
      }
      const chosen = ctx.pick([
        {
          id: 'mct-n/(n+1)',
          text: 'The sequence $a_n = \\frac{n}{n+1}$ is increasing and bounded above by $1$.\nBy the Monotone Convergence Theorem, does it converge? If it converges, give its limit.',
          limit: 1,
          hint: 'A bounded, monotonically increasing sequence must converge. Find the limit.',
          explanation: '$\\lim_{n\\to\\infty} \\frac{n}{n+1} = 1$. The sequence is increasing and bounded above by $1$, so by the MCT it converges, and its limit is $1$.',
        },
        {
          id: 'mct-1/n!',
          text: 'The sequence $a_n = \\frac{1}{n!}$ is decreasing and bounded below by $0$.\nBy the Monotone Convergence Theorem, does it converge? If it converges, give its limit.',
          limit: 0,
          hint: 'A bounded, monotonically decreasing sequence must converge.',
          explanation: 'The sequence is decreasing ($n!$ grows) and bounded below by $0$, so by the MCT it converges; $\\lim \\frac{1}{n!} = 0$.',
        },
      ]);
      return convergenceQuestion(chosen.id, chosen.text, chosen.limit, chosen.explanation, chosen.hint);
    }
    // Every item asks the same two-part question, so the shape of the answer
    // never reveals whether the sequence converges.
    const chosen = ctx.pick([
      {
        formula: '\\frac{1}{n}', limit: 0,
        hint: 'As $n \\to \\infty$, what happens to $\\frac{1}{n}$?',
        explanation: '$\\lim_{n\\to\\infty} \\frac{1}{n} = 0$, so the sequence converges to $0$.',
      },
      {
        formula: '\\frac{n+1}{n}', limit: 1,
        hint: 'Divide numerator and denominator by $n$.',
        explanation: '$\\lim_{n\\to\\infty} \\frac{n+1}{n} = \\lim_{n\\to\\infty} \\left(1 + \\frac{1}{n}\\right) = 1$.',
      },
      {
        formula: '(-1)^n', limit: null,
        hint: 'The terms alternate between $-1$ and $1$.',
        explanation: 'The terms alternate between $-1$ and $1$ and approach no single value, so the sequence diverges.',
      },
      {
        formula: 'n^2', limit: null,
        hint: 'As $n$ gets larger, does $n^2$ approach a finite value?',
        explanation: '$n^2 \\to \\infty$, so the sequence has no finite limit: it diverges.',
      },
    ] as { formula: string; limit: number | null; hint: string; explanation: string }[]);
    return convergenceQuestion(
      `converge-${chosen.formula}`,
      `Does the sequence $a_n = ${chosen.formula}$ converge or diverge? If it converges, give its limit.`,
      chosen.limit,
      chosen.explanation,
      chosen.hint,
    );
  },
};

/**
 * "Does it converge? If so, to what?" as a two-part answer: a verdict choice
 * and a limit that is asked for (and graded) only when "converges" is chosen.
 * `limit: null` means the sequence diverges.
 */
const convergenceQuestion = (templateId: string, text: string, limit: number | null, explanation: string, hint: string): Draft => ({
  templateId,
  problemText: text,
  answer: {
    kind: 'multipart',
    parts: [
      { label: 'Verdict', spec: convergeVerdict(limit === null ? 'diverges' : 'converges') },
      { label: 'Limit', spec: limit === null ? null : exact(limit), when: { part: 0, equals: 'converges' } },
    ],
  },
  displayAnswer: limit === null ? 'Diverges' : `Converges, to $${limit}$`,
  explanation,
  hint,
});

export const seriesConvergence = bank('series-convergence', 2, [
  {
    id: 'geometric-sum-1/2',
    text: 'Geometric series: $\\displaystyle\\sum_{n=0}^{\\infty} \\left(\\frac{1}{2}\\right)^n$\nWhat is the sum?',
    answer: exact(2),
    hint: 'Geometric series $\\sum r^n = \\frac{1}{1-r}$ when $|r| < 1$.',
    explanation: '$\\sum (1/2)^n = \\frac{1}{1 - 1/2} = \\frac{1}{1/2} = 2$',
  },
  {
    id: 'geometric-sum-1/3',
    text: 'Geometric series: $\\displaystyle\\sum_{n=0}^{\\infty} \\left(\\frac{1}{3}\\right)^n$\nWhat is the sum? (exact: a fraction or decimal)',
    answer: exact(1.5),
    display: '$\\frac{3}{2}$',
    hint: 'Geometric series $\\sum r^n = \\frac{1}{1-r}$ when $|r| < 1$.',
    explanation: '$\\sum (1/3)^n = \\frac{1}{1 - 1/3} = \\frac{1}{2/3} = \\frac{3}{2} = 1.5$',
  },
  {
    id: 'harmonic',
    text: 'Does $\\displaystyle\\sum_{n=1}^{\\infty} \\frac{1}{n}$ converge or diverge?\n(This is the harmonic series)',
    answer: convergeVerdict('diverges'),
    hint: 'This is a $p$-series with $p = 1$.',
    explanation: 'The harmonic series $\\sum \\frac{1}{n}$ diverges ($p$-series with $p = 1 \\leq 1$).',
  },
  {
    id: 'p-series-2',
    text: 'Does $\\displaystyle\\sum_{n=1}^{\\infty} \\frac{1}{n^2}$ converge or diverge?',
    answer: convergeVerdict('converges'),
    hint: 'This is a $p$-series with $p = 2$.',
    explanation: '$p$-series with $p = 2 > 1$, so it converges (to $\\frac{\\pi^2}{6}$).',
  },
  {
    id: 'ratio-n!/2^n',
    text: 'Use the Ratio Test on $\\displaystyle\\sum_{n=0}^{\\infty} \\frac{n!}{2^n}$.\nDoes it converge or diverge?',
    answer: convergeVerdict('diverges'),
    hint: 'Find $\\lim\\left|\\frac{a_{n+1}}{a_n}\\right|$. If $> 1$, diverges.',
    explanation: '$\\left|\\frac{a_{n+1}}{a_n}\\right| = \\frac{n+1}{2} \\to \\infty > 1$, so the series diverges.',
  },
  {
    id: 'alternating-harmonic',
    text: 'Does the alternating series $\\displaystyle\\sum_{n=1}^{\\infty} \\frac{(-1)^{n+1}}{n}$ converge or diverge?',
    answer: convergeVerdict('converges'),
    hint: 'Check the Alternating Series Test: is $\\frac{1}{n}$ decreasing and $\\to 0$?',
    explanation: 'By the Alternating Series Test: $b_n = \\frac{1}{n}$ is decreasing and $\\lim b_n = 0$, so it converges.',
  },
  {
    id: 'geometric-3/2',
    text: 'Geometric series: $\\displaystyle\\sum_{n=0}^{\\infty} \\left(\\frac{3}{2}\\right)^n$.\nDoes it converge or diverge?',
    answer: convergeVerdict('diverges'),
    hint: 'For a geometric series, check if $|r| < 1$.',
    explanation: '$|r| = \\frac{3}{2} > 1$, so the geometric series diverges.',
  },
  {
    id: 'nth-term-n/(n+1)',
    text: 'Apply the Nth-Term Test: $\\displaystyle\\sum_{n=1}^{\\infty} \\frac{n}{n+1}$.\nDoes it converge or diverge?',
    answer: convergeVerdict('diverges'),
    hint: 'Find $\\lim_{n \\to \\infty} a_n$. If it is not $0$, the series diverges.',
    explanation: '$\\lim \\frac{n}{n+1} = 1 \\neq 0$, so by the Nth-Term Test the series diverges.',
  },
  {
    id: 'nth-term-inconclusive',
    text: 'Apply the Nth-Term Test: $\\displaystyle\\sum_{n=1}^{\\infty} \\frac{1}{n^2}$.\nDoes the Nth-Term Test tell us it converges?',
    answer: choice(['yes', 'no'], 'no'),
    display: 'No (the test is inconclusive)',
    hint: '$\\lim a_n = 0$, but does that guarantee convergence?',
    explanation: '$\\lim \\frac{1}{n^2} = 0$. The Nth-Term Test is inconclusive when the limit is $0$. (The series does converge, but by the $p$-series test, not the Nth-Term Test.)',
  },
]);

export const powerSeries = bank('power-series', 2, [
  {
    id: 'x^n/n!',
    text: 'Find the radius of convergence $R$ for:\n$\\displaystyle\\sum_{n=0}^{\\infty} \\frac{x^n}{n!}$',
    answer: words('infinity', 'inf', '∞', 'infinite'),
    display: '$R = \\infty$',
    hint: 'Use the Ratio Test: $\\left|\\frac{a_{n+1}}{a_n}\\right| = \\frac{|x|}{n+1}$.',
    explanation: 'Ratio Test: $\\lim \\frac{|x|}{n+1} = 0 < 1$ for every $x$, so $R = \\infty$ (this is the series for $e^x$).',
  },
  {
    id: 'x^n',
    text: 'Find the radius of convergence $R$ for:\n$\\displaystyle\\sum_{n=0}^{\\infty} x^n$',
    answer: exact(1),
    hint: 'This is a geometric series with ratio $x$.',
    explanation: 'The geometric series converges when $|x| < 1$, so $R = 1$.',
  },
  {
    id: 'nx^n',
    text: 'Find the radius of convergence $R$ for:\n$\\displaystyle\\sum_{n=0}^{\\infty} nx^n$',
    answer: exact(1),
    hint: 'Use the Ratio Test: $\\left|\\frac{a_{n+1}}{a_n}\\right| = \\frac{(n+1)|x|}{n}$.',
    explanation: 'Ratio Test: $\\lim \\frac{(n+1)|x|}{n} = |x|$, which is $< 1$ when $|x| < 1$, so $R = 1$.',
  },
  {
    id: 'x^n/2^n',
    text: 'Find the radius of convergence $R$ for:\n$\\displaystyle\\sum_{n=0}^{\\infty} \\frac{x^n}{2^n}$',
    answer: exact(2),
    hint: 'Rewrite as $\\sum \\left(\\frac{x}{2}\\right)^n$ — geometric series.',
    explanation: 'This is $\\sum \\left(\\frac{x}{2}\\right)^n$, which converges when $\\left|\\frac{x}{2}\\right| < 1$, i.e. $|x| < 2$, so $R = 2$.',
  },
  {
    id: 'x^n/n',
    text: 'Find the radius of convergence $R$ for:\n$\\displaystyle\\sum_{n=1}^{\\infty} \\frac{x^n}{n}$',
    answer: exact(1),
    hint: 'Use the Ratio Test: $\\left|\\frac{a_{n+1}}{a_n}\\right| = \\frac{n|x|}{n+1}$.',
    explanation: 'Ratio Test: $\\lim \\frac{n|x|}{n+1} = |x|$, which is $< 1$ when $|x| < 1$, so $R = 1$.',
  },
]);

export const taylorMaclaurin = bank('taylor-maclaurin', 2, [
  {
    id: 'maclaurin-e^x',
    text: 'What is the Maclaurin series for $e^x$?\n(Write the first 4 terms)',
    answer: { kind: 'expression', reference: '1+x+x^2/2+x^3/6' },
    display: '$1 + x + \\frac{x^2}{2!} + \\frac{x^3}{3!}$',
    hint: 'All derivatives of $e^x$ equal $e^x$, and $f(0) = 1$.',
    explanation: '$e^x = \\sum_{n=0}^{\\infty} \\frac{x^n}{n!} = 1 + x + \\frac{x^2}{2!} + \\frac{x^3}{3!} + \\cdots$',
  },
  {
    id: 'maclaurin-sin',
    text: 'What is the Maclaurin series for $\\sin(x)$?\n(Write the first 3 non-zero terms)',
    answer: { kind: 'expression', reference: 'x-x^3/6+x^5/120' },
    display: '$x - \\frac{x^3}{3!} + \\frac{x^5}{5!}$',
    hint: '$\\sin(x)$ has only odd powers of $x$ in its series.',
    explanation: '$\\sin(x) = x - \\frac{x^3}{3!} + \\frac{x^5}{5!} - \\cdots = x - \\frac{x^3}{6} + \\frac{x^5}{120} - \\cdots$',
  },
  {
    id: 'maclaurin-cos',
    text: 'What is the Maclaurin series for $\\cos(x)$?\n(Write the first 3 non-zero terms)',
    answer: { kind: 'expression', reference: '1-x^2/2+x^4/24' },
    display: '$1 - \\frac{x^2}{2!} + \\frac{x^4}{4!}$',
    hint: '$\\cos(x)$ has only even powers of $x$ in its series.',
    explanation: '$\\cos(x) = 1 - \\frac{x^2}{2!} + \\frac{x^4}{4!} - \\cdots = 1 - \\frac{x^2}{2} + \\frac{x^4}{24} - \\cdots$',
  },
  {
    id: 'maclaurin-1/(1-x)',
    text: 'What is the Maclaurin series for $\\frac{1}{1-x}$?\n(Write the first 4 terms)',
    answer: { kind: 'expression', reference: '1+x+x^2+x^3' },
    display: '$1 + x + x^2 + x^3$',
    hint: 'This is a geometric series!',
    explanation: '$\\frac{1}{1-x} = \\sum_{n=0}^{\\infty} x^n = 1 + x + x^2 + x^3 + \\cdots$ for $|x| < 1$.',
  },
  {
    id: 'coefficient-x^2-e^x',
    text: 'What is the coefficient of $x^2$ in the Maclaurin series for $e^x$?\n(Enter an exact value: a fraction or decimal)',
    answer: exact(0.5),
    display: '$\\frac{1}{2}$',
    hint: 'The coefficient of $x^n$ in $e^x$ is $\\frac{1}{n!}$',
    explanation: '$e^x = \\sum \\frac{x^n}{n!}$, so the coefficient of $x^2$ is $\\frac{1}{2!} = \\frac{1}{2}$.',
  },
  {
    // |R_3(0.5)| ≤ M (0.5)^4 / 4! with M = max e^c on [0, 0.5] = e^{0.5}
    id: 'lagrange-e^x',
    text: 'Using the Lagrange error bound, find the maximum error when approximating $e^x$ by its 3rd-degree Maclaurin polynomial at $x = 0.5$.\n(Round to 4 decimal places)',
    answer: roundedTo(Math.exp(0.5) * Math.pow(0.5, 4) / 24, 4),
    display: '$\\frac{e^{0.5}(0.5)^4}{4!} \\approx 0.0043$',
    hint: 'The Lagrange remainder: $|R_n(x)| \\leq \\frac{M|x|^{n+1}}{(n+1)!}$ where $M = \\max|f^{(n+1)}(c)|$ on $[0, x]$.',
    explanation: 'All derivatives of $e^x$ are $e^x$, which is increasing, so on $[0, 0.5]$ the maximum is $M = e^{0.5} \\approx 1.6487$ (using $M = 1$ would NOT be a valid bound, since $e^c > 1$ for $c > 0$). Then $|R_3(0.5)| \\leq \\frac{e^{0.5}(0.5)^4}{4!} = \\frac{1.6487 \\cdot 0.0625}{24} \\approx 0.0043$. The actual error $e^{0.5} - P_3(0.5) \\approx 0.0029$ is indeed below this bound.',
  },
  {
    id: 'alternating-remainder',
    text: 'The alternating series $\\sum_{n=1}^{\\infty} \\frac{(-1)^{n+1}}{n}$ is approximated by its first 4 terms.\nWhat is the bound on the error given by the Alternating Series Remainder? (exact value)',
    answer: exact(0.2),
    display: '$\\frac{1}{5} = 0.2$',
    hint: 'For an alternating series, the error is bounded by the absolute value of the first omitted term.',
    explanation: 'The first 4 terms are $1 - \\frac{1}{2} + \\frac{1}{3} - \\frac{1}{4}$. The first omitted term is $\\frac{1}{5}$, so by the Alternating Series Remainder $|\\text{error}| \\leq \\frac{1}{5} = 0.2$.',
  },
]);

export const parametricEquations: GeneratorDef = {
  topicId: 'parametric-equations',
  version: 2,
  generate: (ctx) => {
    const template = ctx.pick(['eliminate', 'dydx', 'point'] as const);
    if (template === 'eliminate') {
      // x = t + a, y = t² + b  →  y = (x − a)² + b
      const a = ctx.int(1, 5);
      const b = ctx.int(-3, 3);
      const constant = b === 0 ? '' : b > 0 ? ` + ${b}` : ` - ${Math.abs(b)}`;
      return {
        templateId: 'eliminate-shifted-parabola',
        problemText: `Given $x = t + ${a}$, $y = t^2${constant}$\nEliminate the parameter. What is $y$ in terms of $x$?`,
        answer: { kind: 'expression', reference: `(x-${a})^2${b === 0 ? '' : b > 0 ? `+${b}` : `-${Math.abs(b)}`}`, assignable: ['y'] },
        displayAnswer: `$y = (x - ${a})^2${constant}$`,
        explanation: `From $x = t + ${a}$, $t = x - ${a}$. Substitute: $y = (x - ${a})^2${constant}$.`,
        hint: 'Solve the x equation for t, then substitute into the y equation.',
      };
    }
    if (template === 'dydx') {
      // x = t², y = t³: dy/dx = 3t²/(2t) = 3t/2 for t ≠ 0
      const t = ctx.int(2, 5);
      const answer = (3 * t) / 2;
      return {
        templateId: 'dydx-t^2-t^3',
        problemText: `Given $x = t^2$, $y = t^3$\nFind $\\frac{dy}{dx}$ at $t = ${t}$. (exact: a fraction or decimal)`,
        answer: exact(answer),
        displayAnswer: `$${latexFrac(3 * t, 2)} = ${answer}$`,
        explanation: `$\\frac{dy}{dx} = \\frac{dy/dt}{dx/dt} = \\frac{3t^2}{2t} = \\frac{3t}{2}$ (for $t \\neq 0$). At $t = ${t}$: $\\frac{dy}{dx} = ${latexFrac(3 * t, 2)} = ${answer}$.`,
        hint: 'dy/dx = (dy/dt) / (dx/dt). Find each derivative separately.',
      };
    }
    const t = ctx.int(1, 4);
    const a = ctx.int(2, 4);
    return {
      templateId: 'point-y',
      problemText: `Given $x = ${a}t$, $y = t^2$\nWhat is the $y$-coordinate when $t = ${t}$?`,
      answer: exact(t * t),
      explanation: `Substitute $t = ${t}$: $y = ${t}^2 = ${t * t}$.`,
      hint: 'Just substitute the value of t into the y equation.',
    };
  },
};

export const polarCoordinates: GeneratorDef = {
  topicId: 'polar-coordinates',
  version: 2,
  generate: (ctx) => {
    const template = ctx.pick(['cartesian-to-polar-r', 'cartesian-to-polar-theta', 'polar-to-cartesian-x', 'polar-to-cartesian-y', 'identify-curve'] as const);
    if (template === 'cartesian-to-polar-r') {
      const x = ctx.int(3, 8);
      const y = ctx.int(3, 8);
      const r = Math.sqrt(x * x + y * y);
      return {
        templateId: template,
        problemText: `Convert $(${x}, ${y})$ from Cartesian to polar.\nWhat is $r$? (round to 2 decimal places)`,
        answer: roundedTo(r, 2),
        displayAnswer: `$\\sqrt{${x * x + y * y}} \\approx ${r.toFixed(2)}$`,
        explanation: `$r = \\sqrt{x^2 + y^2} = \\sqrt{${x}^2 + ${y}^2} = \\sqrt{${x * x + y * y}} \\approx ${r.toFixed(2)}$`,
        hint: '$r = \\sqrt{x^2 + y^2}$',
      };
    }
    if (template === 'cartesian-to-polar-theta') {
      // The angle is only unique once an interval is fixed, so the text states [0°, 360°).
      const chosen = ctx.pick([
        { x: 1, y: 1, theta: 45, explanation: '$x > 0$, so $\\theta = \\arctan\\left(\\frac{y}{x}\\right) = \\arctan(1) = 45°$ (first quadrant, no adjustment needed).' },
        { x: 0, y: 5, theta: 90, explanation: '$x = 0$ and $y > 0$: the point lies on the positive $y$-axis, so $\\theta = 90°$. ($\\arctan(y/x)$ is undefined here — the formula does not apply when $x = 0$.)' },
        { x: 3, y: 0, theta: 0, explanation: '$y = 0$ and $x > 0$: the point lies on the positive $x$-axis, so $\\theta = 0°$.' },
      ]);
      return {
        templateId: template,
        problemText: `Convert $(${chosen.x}, ${chosen.y})$ from Cartesian to polar.\nWhat is $\\theta$ in degrees, with $0° \\leq \\theta < 360°$?`,
        answer: degrees(chosen.theta),
        displayAnswer: `$${chosen.theta}°$`,
        explanation: chosen.explanation,
        hint: 'Use the signs of $x$ and $y$ to find the quadrant. $\\arctan(y/x)$ alone is only correct when $x > 0$, and is undefined when $x = 0$.',
      };
    }
    if (template === 'polar-to-cartesian-x') {
      const chosen = ctx.pick([
        { r: 4, theta: 60, x: 2, cosLatex: '\\frac{1}{2}', exactLatex: '2' },
        { r: 6, theta: 0, x: 6, cosLatex: '1', exactLatex: '6' },
        { r: 2, theta: 90, x: 0, cosLatex: '0', exactLatex: '0' },
        { r: 4, theta: 45, x: 2 * Math.SQRT2, cosLatex: '\\frac{\\sqrt{2}}{2}', exactLatex: `2\\sqrt{2} \\approx ${(2 * Math.SQRT2).toFixed(2)}` },
      ]);
      return {
        templateId: template,
        problemText: `Convert polar $(r=${chosen.r},\\; \\theta=${chosen.theta}°)$ to Cartesian.\nWhat is $x$? (round to 2 decimal places)`,
        answer: roundedTo(chosen.x, 2),
        displayAnswer: `$${chosen.exactLatex}$`,
        explanation: `$x = r\\cos(\\theta) = ${chosen.r}\\cos(${chosen.theta}°) = ${chosen.r} \\cdot ${chosen.cosLatex} = ${chosen.exactLatex}$`,
        hint: '$x = r\\cos(\\theta)$',
      };
    }
    if (template === 'polar-to-cartesian-y') {
      const chosen = ctx.pick([
        { r: 4, theta: 30, y: 2, sinLatex: '\\frac{1}{2}' },
        { r: 6, theta: 90, y: 6, sinLatex: '1' },
        { r: 2, theta: 0, y: 0, sinLatex: '0' },
      ]);
      return {
        templateId: template,
        problemText: `Convert polar $(r=${chosen.r},\\; \\theta=${chosen.theta}°)$ to Cartesian.\nWhat is $y$?`,
        answer: exact(chosen.y),
        explanation: `$y = r\\sin(\\theta) = ${chosen.r}\\sin(${chosen.theta}°) = ${chosen.r} \\cdot ${chosen.sinLatex} = ${chosen.y}$`,
        hint: '$y = r\\sin(\\theta)$',
      };
    }
    const chosen = ctx.pick([
      { eq: '$r = 5$', answer: 'circle', hint: '$r = $ constant means all points are the same distance from the origin.' },
      { eq: '$\\theta = \\frac{\\pi}{4}$ (with $r$ allowed to be negative)', answer: 'line', hint: '$\\theta = $ constant with $r \\in \\mathbb{R}$ is a full line through the origin ($r < 0$ gives the opposite ray); with $r \\geq 0$ only, it would be a ray.' },
      { eq: '$r = 2\\cos(\\theta)$', answer: 'circle', hint: '$r = a\\cos(\\theta)$ is a circle passing through the origin.' },
      { eq: '$r = 3\\sin(\\theta)$', answer: 'circle', hint: '$r = a\\sin(\\theta)$ is a circle passing through the origin.' },
    ]);
    return {
      templateId: template,
      problemText: `What type of curve is ${chosen.eq}?`,
      answer: chosen.answer === 'circle' ? words('circle', 'a circle') : words('line', 'a line', 'straight line', 'a straight line'),
      displayAnswer: `A ${chosen.answer}`,
      explanation: `The polar equation ${chosen.eq} represents a ${chosen.answer}.`,
      hint: chosen.hint,
    };
  },
};

export const integrationApplications: GeneratorDef = {
  topicId: 'integration-applications',
  version: 2,
  generate: (ctx) => {
    // The answer is the exact value; anything within half a unit of the last
    // requested decimal place is accepted.
    const template = ctx.pick(['disk', 'washer', 'shell', 'arc-length', 'surface-area'] as const);
    if (template === 'disk') {
      const a = ctx.int(2, 5);
      const vol = Math.PI * Math.pow(a, 3) / 3;
      return {
        templateId: 'disk-y=x',
        problemText: `Find the volume of the solid formed by revolving $y = x$ around the x-axis from $x = 0$ to $x = ${a}$.\n(Use the disk method. Round to 2 decimal places.)`,
        answer: roundedTo(vol, 2),
        displayAnswer: `$\\frac{${a * a * a}\\pi}{3} \\approx ${vol.toFixed(2)}$`,
        explanation: `$V = \\pi\\int_0^{${a}} x^2\\,dx = \\pi\\left[\\frac{x^3}{3}\\right]_0^{${a}} = \\frac{${a * a * a}\\pi}{3} \\approx ${vol.toFixed(2)}$`,
        hint: 'Disk method: $V = \\pi \\int_a^b [f(x)]^2\\,dx$. Here $f(x) = x$.',
      };
    }
    if (template === 'washer') {
      const vol = 2 * Math.PI / 15;
      return {
        templateId: 'washer-x-x^2',
        problemText: 'Find the volume of the solid formed by revolving the region between $y = x$ and $y = x^2$ (from $x=0$ to $x=1$) around the x-axis.\n(Round to 3 decimal places.)',
        answer: roundedTo(vol, 3),
        displayAnswer: `$\\frac{2\\pi}{15} \\approx ${vol.toFixed(3)}$`,
        explanation: `On $[0,1]$, $x \\geq x^2$, so the outer radius is $x$. $V = \\pi\\int_0^1 (x^2 - x^4)\\,dx = \\pi\\left[\\frac{x^3}{3} - \\frac{x^5}{5}\\right]_0^1 = \\pi\\left(\\frac{1}{3} - \\frac{1}{5}\\right) = \\frac{2\\pi}{15} \\approx ${vol.toFixed(3)}$`,
        hint: 'Washer method: $V = \\pi \\int [R(x)]^2 - [r(x)]^2\\,dx$. Which function is farther from the x-axis on $[0,1]$?',
      };
    }
    if (template === 'shell') {
      const a = ctx.int(1, 3);
      const vol = Math.PI * Math.pow(a, 4) / 2;
      return {
        templateId: 'shell-y=x^2',
        problemText: `Use the shell method to find the volume when $y = x^2$ (from $x=0$ to $x=${a}$) is revolved around the y-axis.\n(Round to 2 decimal places.)`,
        answer: roundedTo(vol, 2),
        displayAnswer: `$\\frac{${Math.pow(a, 4)}\\pi}{2} \\approx ${vol.toFixed(2)}$`,
        explanation: `$V = 2\\pi\\int_0^{${a}} x \\cdot x^2\\,dx = 2\\pi\\left[\\frac{x^4}{4}\\right]_0^{${a}} = \\frac{${Math.pow(a, 4)}\\pi}{2} \\approx ${vol.toFixed(2)}$`,
        hint: 'Shell method: $V = 2\\pi \\int_a^b x \\cdot f(x)\\,dx$. Here $f(x) = x^2$.',
      };
    }
    if (template === 'arc-length') {
      const a = ctx.int(2, 6);
      const length = a * Math.SQRT2;
      return {
        templateId: 'arc-length-y=x',
        problemText: `Find the arc length of $y = x$ from $x = 0$ to $x = ${a}$.\n(Round to 2 decimal places.)`,
        answer: roundedTo(length, 2),
        displayAnswer: `$${a}\\sqrt{2} \\approx ${length.toFixed(2)}$`,
        explanation: `$L = \\int_0^{${a}} \\sqrt{1 + [f'(x)]^2}\\,dx = \\int_0^{${a}} \\sqrt{1 + 1}\\,dx = ${a}\\sqrt{2} \\approx ${length.toFixed(2)}$`,
        hint: 'Arc length: $L = \\int_a^b \\sqrt{1 + [f\'(x)]^2}\\,dx$. Find $f\'(x)$ first.',
      };
    }
    const a = ctx.int(2, 4);
    const area = Math.PI * Math.SQRT2 * a * a;
    return {
      templateId: 'surface-area-y=x',
      problemText: `Find the surface area when $y = x$ from $x = 0$ to $x = ${a}$ is revolved around the x-axis.\n(Round to 2 decimal places.)`,
      answer: roundedTo(area, 2),
      displayAnswer: `$${a * a}\\sqrt{2}\\pi \\approx ${area.toFixed(2)}$`,
      explanation: `Here $f(x) = x \\geq 0$ on $[0, ${a}]$. $S = 2\\pi\\int_0^{${a}} x\\sqrt{1 + 1}\\,dx = 2\\sqrt{2}\\pi\\left[\\frac{x^2}{2}\\right]_0^{${a}} = ${a * a}\\sqrt{2}\\pi \\approx ${area.toFixed(2)}$`,
      hint: 'Surface area: $S = 2\\pi \\int f(x)\\sqrt{1 + [f\'(x)]^2}\\,dx$ (for $f(x) \\geq 0$).',
    };
  },
};

/**
 * Substitutions are equations "x = a·f(θ)". Any parameter name is accepted
 * (θ, t, u, ...), and the co-function substitution is a valid alternative
 * since it works with a suitable parameter interval.
 */
const substitution = (...rhs: string[]): AnswerSpec =>
  ({ kind: 'anyOf', options: rhs.map(r => ({ kind: 'equation', lhs: 'x', rhs: r, parameters: ['theta'] }) as AnswerSpec) });

export const trigSubstitution = bank('trig-substitution', 2, [
  {
    id: 'sqrt(a^2-x^2)',
    text: 'For $\\displaystyle\\int \\sqrt{4 - x^2}\\,dx$, what trigonometric substitution should you use?\n(Answer as an equation, e.g. "x = ...")',
    answer: substitution('2sin(theta)', '2cos(theta)'),
    display: '$x = 2\\sin\\theta$ (or $x = 2\\cos\\theta$)',
    hint: 'The integrand has the form $\\sqrt{a^2 - x^2}$ with $a = 2$.',
    explanation: 'For $\\sqrt{a^2 - x^2}$ use $x = a\\sin\\theta$ with $-\\frac{\\pi}{2} \\leq \\theta \\leq \\frac{\\pi}{2}$, so $\\sqrt{4 - 4\\sin^2\\theta} = 2\\cos\\theta$. Here $a = 2$: $x = 2\\sin\\theta$. ($x = 2\\cos\\theta$ with $0 \\leq \\theta \\leq \\pi$ also works.)',
  },
  {
    id: 'sqrt(x^2+a^2)',
    text: 'For $\\displaystyle\\int \\frac{dx}{\\sqrt{x^2 + 9}}$, what trigonometric substitution should you use?\n(Answer as an equation, e.g. "x = ...")',
    answer: substitution('3tan(theta)', '3cot(theta)'),
    display: '$x = 3\\tan\\theta$',
    hint: 'The integrand has the form $\\sqrt{x^2 + a^2}$ with $a = 3$.',
    explanation: 'For $\\sqrt{x^2 + a^2}$ use $x = a\\tan\\theta$ with $-\\frac{\\pi}{2} < \\theta < \\frac{\\pi}{2}$, so $\\sqrt{9\\tan^2\\theta + 9} = 3\\sec\\theta$. Here $a = 3$: $x = 3\\tan\\theta$.',
  },
  {
    id: 'sqrt(x^2-a^2)',
    text: 'For $\\displaystyle\\int \\frac{dx}{x^2\\sqrt{x^2 - 16}}$, what trigonometric substitution should you use?\n(Answer as an equation, e.g. "x = ...")',
    answer: substitution('4sec(theta)', '4csc(theta)'),
    display: '$x = 4\\sec\\theta$',
    hint: 'The integrand has the form $\\sqrt{x^2 - a^2}$ with $a = 4$.',
    explanation: 'For $\\sqrt{x^2 - a^2}$ use $x = a\\sec\\theta$ with $0 \\leq \\theta < \\frac{\\pi}{2}$ (for $x \\geq a$), so $\\sqrt{16\\sec^2\\theta - 16} = 4\\tan\\theta$. Here $a = 4$: $x = 4\\sec\\theta$.',
  },
  {
    id: 'quarter-circle',
    text: 'Evaluate exactly: $\\displaystyle\\int_0^1 \\sqrt{1 - x^2}\\,dx$\n(This is a quarter-circle area. You may type "pi/4".)',
    answer: exact(Math.PI / 4),
    display: '$\\frac{\\pi}{4} \\approx 0.7854$',
    hint: 'Substitute $x = \\sin(\\theta)$, or recognize this as the area of a quarter unit circle.',
    explanation: '$\\int_0^1 \\sqrt{1 - x^2}\\,dx$ is the area under the upper unit semicircle for $0 \\leq x \\leq 1$: a quarter circle of radius 1, so it equals $\\frac{\\pi}{4} \\approx 0.7854$.',
  },
]);
