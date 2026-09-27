/** Trigonometry. Displayed values are exact, so the problem shown is the problem graded. */
import { PYTHAGOREAN_TRIPLES } from '../../constants';
import type { GeneratorDef, SpecialAngle, TrigFn } from './context';
import { SPECIAL_TRIG, degrees, latexFrac, roundedTo, simplifyFraction } from './context';

export const trigRatios: GeneratorDef = {
  topicId: 'trig-ratios',
  version: 2,
  templates: ['sin', 'cos', 'tan'],
  generate: (ctx) => {
    const [a, b, c] = ctx.pick(PYTHAGOREAN_TRIPLES);
    const ratio = ctx.pick(['sin', 'cos', 'tan'] as const);
    // Angle opposite side a: opposite = a, adjacent = b; opposite side b: the reverse.
    const oppositeA = ctx.bool();
    const opposite = oppositeA ? a : b;
    const adjacent = oppositeA ? b : a;
    const [num, den] = ratio === 'sin' ? [opposite, c] : ratio === 'cos' ? [adjacent, c] : [opposite, adjacent];
    const value = num / den;
    const reduced = simplifyFraction(num, den);
    const [top, bottom] = ratio === 'sin' ? ['opposite', 'hypotenuse'] : ratio === 'cos' ? ['adjacent', 'hypotenuse'] : ['opposite', 'adjacent'];
    return {
      templateId: ratio,
      problemText: `In a right triangle with sides $${a}$, $${b}$, $${c}$ (hypotenuse), find $\\${ratio}(\\theta)$ where $\\theta$ is opposite to side $${opposite}$.\n(Enter a fraction, or a decimal rounded to 3 places.)`,
      answer: roundedTo(value, 3),
      displayAnswer: `$${latexFrac(reduced.numerator, reduced.denominator)} \\approx ${value.toFixed(3)}$`,
      explanation: `$\\${ratio}(\\theta) = \\frac{\\text{${top}}}{\\text{${bottom}}} = \\frac{${num}}{${den}}${reduced.denominator !== den ? ` = ${latexFrac(reduced.numerator, reduced.denominator)}` : ''} \\approx ${value.toFixed(3)}$`,
      hint: 'SOH-CAH-TOA: sin = opposite/hypotenuse, cos = adjacent/hypotenuse, tan = opposite/adjacent',
    };
  },
};

const ANGLES: SpecialAngle[] = [30, 45, 60];
const FNS: TrigFn[] = ['sin', 'cos', 'tan'];

// ---------------------------------------------------------------------------
// The unit circle, exactly
// ---------------------------------------------------------------------------

/** An exact trigonometric value: LaTeX, plain text, and number. */
interface Exact { latex: string; text: string; value: number }

const ZERO: Exact = { latex: '0', text: '0', value: 0 };
const ONE: Exact = { latex: '1', text: '1', value: 1 };
const negate = (v: Exact): Exact => (v.value === 0 ? v : { latex: `-${v.latex}`, text: `-${v.text}`, value: -v.value });

/** sin, cos, tan of a reference angle in [0°, 90°]; tan(90°) is undefined (null). */
const REFERENCE: Record<number, Record<TrigFn, Exact | null>> = {
  0: { sin: ZERO, cos: ONE, tan: ZERO },
  30: { sin: SPECIAL_TRIG[30].sin, cos: SPECIAL_TRIG[30].cos, tan: SPECIAL_TRIG[30].tan },
  45: { sin: SPECIAL_TRIG[45].sin, cos: SPECIAL_TRIG[45].cos, tan: SPECIAL_TRIG[45].tan },
  60: { sin: SPECIAL_TRIG[60].sin, cos: SPECIAL_TRIG[60].cos, tan: SPECIAL_TRIG[60].tan },
  90: { sin: ONE, cos: ZERO, tan: null },
};

/** Standard angles of the unit circle in [0°, 360°). */
const UNIT_ANGLES = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330] as const;

const referenceAngle = (deg: number): number => {
  const d = ((deg % 360) + 360) % 360;
  return d <= 90 ? d : d <= 180 ? 180 - d : d <= 270 ? d - 180 : 360 - d;
};

/** Exact sin/cos/tan of a standard angle (null where tan is undefined). */
const unitValue = (fn: TrigFn, deg: number): Exact | null => {
  const ref = REFERENCE[referenceAngle(deg)][fn];
  if (ref === null) return null;
  const d = ((deg % 360) + 360) % 360;
  const sinSign = d > 180 ? -1 : 1;
  const cosSign = d > 90 && d < 270 ? -1 : 1;
  const sign = fn === 'sin' ? sinSign : fn === 'cos' ? cosSign : sinSign * cosSign;
  return sign < 0 ? negate(ref) : ref;
};

const quadrantNote = (deg: number): string => {
  if (deg % 90 === 0) return `$${deg}°$ lies on an axis`;
  const q = deg < 90 ? 'I' : deg < 180 ? 'II' : deg < 270 ? 'III' : 'IV';
  return `$${deg}°$ is in quadrant ${q} with reference angle $${referenceAngle(deg)}°$`;
};

export const trigSpecialAngles: GeneratorDef = {
  topicId: 'trig-special-angles',
  version: 3,
  templates: ['sin-special', 'cos-special', 'tan-special'],
  generate: (ctx) => {
    const ratio = ctx.pick(FNS);
    const angle = ctx.pick(UNIT_ANGLES.filter(d => unitValue(ratio, d) !== null));
    const v = unitValue(ratio, angle)!;
    return {
      templateId: `${ratio}-special`,
      problemText: `Evaluate $\\${ratio}(${angle}°)$. Round to 3 decimal places.`,
      answer: roundedTo(v.value, 3),
      displayAnswer: `$${v.latex}${Number.isInteger(v.value) ? '' : ` \\approx ${v.value.toFixed(3)}`}$`,
      explanation: `${quadrantNote(angle)}, so $\\${ratio}(${angle}°) = ${v.latex}${Number.isInteger(v.value) ? '' : ` \\approx ${v.value.toFixed(3)}`}$ (the value at the reference angle, with the sign ${ratio} has there).`,
      hint: 'Find the reference angle, take the special-triangle value, then fix the sign by the quadrant.',
    };
  },
};

// ---------------------------------------------------------------------------
// Identities
// ---------------------------------------------------------------------------

interface Identity {
  id: string; display: string; reference: string; displayAnswer: string; name: string; explanation: string;
  /** Restating the left side is the same function but not an answer. */
  forbid: { functions?: string[]; simpleArguments?: boolean };
}

const IDENTITIES: Identity[] = [
  { id: 'pythagorean', display: '\\sin^2\\theta + \\cos^2\\theta', reference: '1', displayAnswer: '$1$', name: 'Pythagorean identity', forbid: { functions: ['sin', 'cos'] },
    explanation: 'On the unit circle a point is $(\\cos\\theta, \\sin\\theta)$ and its distance from the origin is 1, so $\\sin^2\\theta + \\cos^2\\theta = 1$.' },
  { id: 'quotient', display: '\\tan\\theta', reference: 'sin(theta)/cos(theta)', displayAnswer: '$\\frac{\\sin\\theta}{\\cos\\theta}$', name: 'quotient identity', forbid: { functions: ['tan', 'cot'] },
    explanation: 'Tangent is opposite over adjacent; dividing both by the hypotenuse gives $\\tan\\theta = \\frac{\\sin\\theta}{\\cos\\theta}$ (where $\\cos\\theta \\neq 0$).' },
  { id: 'quotient-cot', display: '\\cot\\theta', reference: 'cos(theta)/sin(theta)', displayAnswer: '$\\frac{\\cos\\theta}{\\sin\\theta}$', name: 'quotient identity', forbid: { functions: ['cot', 'tan'] },
    explanation: '$\\cot\\theta = \\frac{1}{\\tan\\theta} = \\frac{\\cos\\theta}{\\sin\\theta}$ (where $\\sin\\theta \\neq 0$).' },
  { id: 'reciprocal-sec', display: '\\sec\\theta', reference: '1/cos(theta)', displayAnswer: '$\\frac{1}{\\cos\\theta}$', name: 'reciprocal identity', forbid: { functions: ['sec'] },
    explanation: 'By definition $\\sec\\theta = \\frac{1}{\\cos\\theta}$ (where $\\cos\\theta \\neq 0$).' },
  { id: 'reciprocal-csc', display: '\\csc\\theta', reference: '1/sin(theta)', displayAnswer: '$\\frac{1}{\\sin\\theta}$', name: 'reciprocal identity', forbid: { functions: ['csc'] },
    explanation: 'By definition $\\csc\\theta = \\frac{1}{\\sin\\theta}$ (where $\\sin\\theta \\neq 0$).' },
  { id: 'pythagorean-tan', display: '1 + \\tan^2\\theta', reference: 'sec(theta)^2', displayAnswer: '$\\sec^2\\theta$', name: 'Pythagorean identity', forbid: { functions: ['tan', 'cot'] },
    explanation: 'Divide $\\sin^2\\theta + \\cos^2\\theta = 1$ by $\\cos^2\\theta$: $\\tan^2\\theta + 1 = \\sec^2\\theta$.' },
  { id: 'pythagorean-cot', display: '1 + \\cot^2\\theta', reference: 'csc(theta)^2', displayAnswer: '$\\csc^2\\theta$', name: 'Pythagorean identity', forbid: { functions: ['cot', 'tan'] },
    explanation: 'Divide $\\sin^2\\theta + \\cos^2\\theta = 1$ by $\\sin^2\\theta$: $1 + \\cot^2\\theta = \\csc^2\\theta$.' },
  { id: 'cofunction-sin', display: '\\sin(90° - \\theta)', reference: 'cos(theta)', displayAnswer: '$\\cos\\theta$', name: 'cofunction identity', forbid: { simpleArguments: true },
    explanation: 'The two acute angles of a right triangle are complementary, so the side opposite one is adjacent to the other: $\\sin(90° - \\theta) = \\cos\\theta$.' },
  { id: 'cofunction-cos', display: '\\cos(90° - \\theta)', reference: 'sin(theta)', displayAnswer: '$\\sin\\theta$', name: 'cofunction identity', forbid: { simpleArguments: true },
    explanation: 'The two acute angles of a right triangle are complementary, so the side adjacent to one is opposite the other: $\\cos(90° - \\theta) = \\sin\\theta$.' },
  { id: 'cofunction-tan', display: '\\tan(90° - \\theta)', reference: 'cot(theta)', displayAnswer: '$\\cot\\theta$', name: 'cofunction identity', forbid: { simpleArguments: true },
    explanation: 'Opposite and adjacent swap roles for the complementary angle: $\\tan(90° - \\theta) = \\frac{\\cos\\theta}{\\sin\\theta} = \\cot\\theta$.' },
  { id: 'even-odd-sin', display: '\\sin(-\\theta)', reference: '-sin(theta)', displayAnswer: '$-\\sin\\theta$', name: 'even/odd identity', forbid: { simpleArguments: true },
    explanation: 'Reflecting the angle in the $x$-axis negates the $y$-coordinate: sine is odd, $\\sin(-\\theta) = -\\sin\\theta$.' },
  { id: 'even-odd-cos', display: '\\cos(-\\theta)', reference: 'cos(theta)', displayAnswer: '$\\cos\\theta$', name: 'even/odd identity', forbid: { simpleArguments: true },
    explanation: 'Reflecting the angle in the $x$-axis keeps the $x$-coordinate: cosine is even, $\\cos(-\\theta) = \\cos\\theta$.' },
  { id: 'supplement-sin', display: '\\sin(180° - \\theta)', reference: 'sin(theta)', displayAnswer: '$\\sin\\theta$', name: 'supplementary-angle identity', forbid: { simpleArguments: true },
    explanation: 'Reflecting the point in the $y$-axis keeps its $y$-coordinate: $\\sin(180° - \\theta) = \\sin\\theta$.' },
  { id: 'half-turn-cos', display: '\\cos(\\theta + 180°)', reference: '-cos(theta)', displayAnswer: '$-\\cos\\theta$', name: 'half-turn identity', forbid: { simpleArguments: true },
    explanation: 'A half turn sends $(x, y)$ to $(-x, -y)$: $\\cos(\\theta + 180°) = -\\cos\\theta$.' },
  { id: 'double-angle-sin', display: '\\sin(2\\theta)', reference: '2*sin(theta)*cos(theta)', displayAnswer: '$2\\sin\\theta\\cos\\theta$', name: 'double-angle identity', forbid: { simpleArguments: true },
    explanation: 'From the angle-sum formula with both angles $\\theta$: $\\sin(\\theta + \\theta) = \\sin\\theta\\cos\\theta + \\cos\\theta\\sin\\theta = 2\\sin\\theta\\cos\\theta$.' },
  { id: 'double-angle-cos', display: '\\cos(2\\theta)', reference: 'cos(theta)^2 - sin(theta)^2', displayAnswer: '$\\cos^2\\theta - \\sin^2\\theta$ (or $1 - 2\\sin^2\\theta$, or $2\\cos^2\\theta - 1$)', name: 'double-angle identity', forbid: { simpleArguments: true },
    explanation: '$\\cos(\\theta + \\theta) = \\cos\\theta\\cos\\theta - \\sin\\theta\\sin\\theta = \\cos^2\\theta - \\sin^2\\theta$; with $\\sin^2 + \\cos^2 = 1$ this also equals $1 - 2\\sin^2\\theta$ and $2\\cos^2\\theta - 1$.' },
];

export const trigIdentities: GeneratorDef = {
  topicId: 'trig-identities',
  version: 3,
  templates: IDENTITIES.map(i => i.id),
  generate: (ctx) => {
    const chosen = ctx.pick(IDENTITIES);
    const note = chosen.forbid.simpleArguments
      ? 'Write it using functions of $\\theta$ alone.'
      : `Do not use $${chosen.forbid.functions!.map(f => `\\${f}`).join('$ or $')}$ in your answer.`;
    return {
      templateId: chosen.id,
      problemText: `Complete the identity: $${chosen.display} = \\;?$\n(${note} Use θ or "theta".)`,
      answer: { kind: 'expression', reference: chosen.reference, forbid: chosen.forbid },
      displayAnswer: chosen.displayAnswer,
      explanation: chosen.explanation,
      hint: `This is a ${chosen.name}.`,
    };
  },
};

// ---------------------------------------------------------------------------
// Equations
// ---------------------------------------------------------------------------

/** Values whose solutions are standard angles. */
const SIN_COS_VALUES = ['-1', '-\\frac{\\sqrt{3}}{2}', '-\\frac{\\sqrt{2}}{2}', '-\\frac{1}{2}', '0', '\\frac{1}{2}', '\\frac{\\sqrt{2}}{2}', '\\frac{\\sqrt{3}}{2}', '1'];
const TAN_VALUES = ['-\\sqrt{3}', '-1', '-\\frac{\\sqrt{3}}{3}', '0', '\\frac{\\sqrt{3}}{3}', '1', '\\sqrt{3}'];

export const trigEquations: GeneratorDef = {
  topicId: 'trig-equations',
  version: 3,
  templates: ['solve-sin', 'solve-cos', 'solve-tan', 'all-solutions'],
  generate: (ctx) => {
    if (ctx.bool(0.35)) {
      // one solution in [0°, 90°]: the function is monotonic there
      const angle = ctx.pick(ANGLES);
      const ratio = ctx.pick(FNS);
      const v = SPECIAL_TRIG[angle][ratio];
      return {
        templateId: `solve-${ratio}`,
        problemText: `Solve for $\\theta$ in degrees ($0° \\leq \\theta \\leq 90°$): $\\${ratio}(\\theta) = ${v.latex}$`,
        answer: degrees(angle),
        displayAnswer: `$${angle}°$`,
        explanation: `$\\${ratio}(${angle}°) = ${v.latex}$, and $\\${ratio}$ is ${ratio === 'cos' ? 'strictly decreasing' : 'strictly increasing'} on ${ratio === 'tan' ? '$[0°, 90°)$ (its domain within the given interval)' : '$[0°, 90°]$'}, so it takes this value only once: $\\theta = ${angle}°$.`,
        hint: 'Think about special angles: 30°, 45°, 60°.',
      };
    }
    // every solution in [0°, 360°)
    const ratio = ctx.pick(FNS);
    const target = ctx.pick(ratio === 'tan' ? TAN_VALUES : SIN_COS_VALUES);
    const solutions = UNIT_ANGLES.filter(d => unitValue(ratio, d)?.latex === target);
    ctx.require(solutions.length > 0, 'nonDegenerate');
    const list = solutions.map(d => `${d}°`).join(', ');
    return {
      templateId: 'all-solutions',
      problemText: `Find all solutions in degrees with $0° \\leq \\theta < 360°$: $\\${ratio}(\\theta) = ${target}$\n(Separate solutions with commas.)`,
      answer: { kind: 'finiteSet', elements: solutions },
      displayAnswer: `$\\theta = ${solutions.map(d => `${d}°`).join(',\\ ')}$`,
      explanation: solutions.length === 1
        ? `On one full turn $\\${ratio}$ takes the value $${target}$ only at $${list}$.`
        : `On one full turn $\\${ratio}$ takes the value $${target}$ at ${solutions.map(d => `$${d}°$`).join(' and ')} (${solutions.map(quadrantNote).join('; ')}).`,
      hint: 'Find the reference angle, then every quadrant where the function has the required sign (or the axis angles for 0 and ±1).',
    };
  },
};

// ---------------------------------------------------------------------------
// Inverse functions: principal values
// ---------------------------------------------------------------------------

const PRINCIPAL: Record<TrigFn, { range: string; angles: number[] }> = {
  sin: { range: '[-90°, 90°]', angles: [-90, -60, -45, -30, 0, 30, 45, 60, 90] },
  cos: { range: '[0°, 180°]', angles: [0, 30, 45, 60, 90, 120, 135, 150, 180] },
  tan: { range: '(-90°, 90°)', angles: [-60, -45, -30, 0, 30, 45, 60] },
};

export const inverseTrig: GeneratorDef = {
  topicId: 'inverse-trig',
  version: 4,
  templates: ['arcsin', 'arccos', 'arctan'],
  generate: (ctx) => {
    const func = ctx.pick(FNS);
    const angle = ctx.pick(PRINCIPAL[func].angles);
    const v = unitValue(func, angle)!;
    return {
      templateId: `arc${func}`,
      problemText: `Evaluate in degrees: $\\${func}^{-1}\\left(${v.latex}\\right)$`,
      answer: degrees(angle),
      displayAnswer: `$${angle}°$`,
      explanation: `$\\${func}(${angle}°) = ${v.latex}$ and $${angle}°$ lies in the principal range $${PRINCIPAL[func].range}$ of $\\${func}^{-1}$, so $\\${func}^{-1}\\left(${v.latex}\\right) = ${angle}°$.${func === 'cos' && angle > 90 ? ' (Not a negative angle: the principal range of $\\cos^{-1}$ is $[0°, 180°]$.)' : ''}${func !== 'cos' && angle < 0 ? ` (Not $${360 + angle}°$: the principal range is $${PRINCIPAL[func].range}$.)` : ''}`,
      hint: `Which angle in $${PRINCIPAL[func].range}$ has ${func} equal to $${v.latex}$?`,
    };
  },
};
