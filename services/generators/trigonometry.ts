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

export const trigSpecialAngles: GeneratorDef = {
  topicId: 'trig-special-angles',
  version: 2,
  templates: ['sin-special', 'cos-special', 'tan-special'],
  generate: (ctx) => {
    const angle = ctx.pick(ANGLES);
    const ratio = ctx.pick(FNS);
    const v = SPECIAL_TRIG[angle][ratio];
    return {
      templateId: `${ratio}-special`,
      problemText: `Evaluate $\\${ratio}(${angle}°)$. Round to 3 decimal places.`,
      answer: roundedTo(v.value, 3),
      displayAnswer: `$${v.latex} \\approx ${v.value.toFixed(3)}$`,
      explanation: `From the ${angle === 45 ? '45-45-90' : '30-60-90'} triangle, $\\${ratio}(${angle}°) = ${v.latex} \\approx ${v.value.toFixed(3)}$.`,
      hint: angle === 45 ? '45-45-90 triangle!' : '30-60-90 triangle!',
    };
  },
};

const IDENTITIES = [
  { id: 'pythagorean', display: '$\\sin^2\\theta + \\cos^2\\theta = \\;?$', reference: '1', displayAnswer: '$1$', name: 'Pythagorean identity',
    explanation: 'On the unit circle a point is $(\\cos\\theta, \\sin\\theta)$ and its distance from the origin is 1, so $\\sin^2\\theta + \\cos^2\\theta = 1$.' },
  { id: 'quotient', display: '$\\tan\\theta = \\;?$', reference: 'sin(theta)/cos(theta)', displayAnswer: '$\\frac{\\sin\\theta}{\\cos\\theta}$', name: 'tangent identity',
    explanation: 'Tangent is opposite over adjacent, and dividing by the hypotenuse top and bottom gives $\\tan\\theta = \\frac{\\sin\\theta}{\\cos\\theta}$ (where $\\cos\\theta \\neq 0$).' },
  { id: 'pythagorean-tan', display: '$1 + \\tan^2\\theta = \\;?$', reference: 'sec(theta)^2', displayAnswer: '$\\sec^2\\theta$', name: 'Pythagorean identity',
    explanation: 'Divide $\\sin^2\\theta + \\cos^2\\theta = 1$ by $\\cos^2\\theta$: $\\tan^2\\theta + 1 = \\sec^2\\theta$.' },
  { id: 'cofunction-sin', display: '$\\sin(90° - \\theta) = \\;?$', reference: 'cos(theta)', displayAnswer: '$\\cos\\theta$', name: 'cofunction identity',
    explanation: 'The two acute angles of a right triangle are complementary, so the side opposite one is adjacent to the other: $\\sin(90° - \\theta) = \\cos\\theta$.' },
  { id: 'cofunction-cos', display: '$\\cos(90° - \\theta) = \\;?$', reference: 'sin(theta)', displayAnswer: '$\\sin\\theta$', name: 'cofunction identity',
    explanation: 'The two acute angles of a right triangle are complementary, so the side adjacent to one is opposite the other: $\\cos(90° - \\theta) = \\sin\\theta$.' },
] as const;

export const trigIdentities: GeneratorDef = {
  topicId: 'trig-identities',
  version: 2,
  templates: ['pythagorean', 'quotient', 'pythagorean-tan', 'cofunction-sin', 'cofunction-cos'],
  generate: (ctx) => {
    const chosen = ctx.pick(IDENTITIES);
    return {
      templateId: chosen.id,
      problemText: `Complete the identity: ${chosen.display}\n(Use θ or "theta".)`,
      answer: { kind: 'expression', reference: chosen.reference },
      displayAnswer: chosen.displayAnswer,
      explanation: chosen.explanation,
      hint: `This is a ${chosen.name}.`,
    };
  },
};

export const trigEquations: GeneratorDef = {
  topicId: 'trig-equations',
  version: 2,
  templates: ['solve-sin', 'solve-cos', 'solve-tan'],
  generate: (ctx) => {
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
  },
};

const INVERSE_CASES: { func: TrigFn; angle: SpecialAngle; range: string }[] = [
  { func: 'sin', angle: 30, range: '[-90°, 90°]' },
  { func: 'sin', angle: 45, range: '[-90°, 90°]' },
  { func: 'sin', angle: 60, range: '[-90°, 90°]' },
  { func: 'cos', angle: 60, range: '[0°, 180°]' },
  { func: 'cos', angle: 45, range: '[0°, 180°]' },
  { func: 'cos', angle: 30, range: '[0°, 180°]' },
  { func: 'tan', angle: 30, range: '(-90°, 90°)' },
  { func: 'tan', angle: 45, range: '(-90°, 90°)' },
  { func: 'tan', angle: 60, range: '(-90°, 90°)' },
];

export const inverseTrig: GeneratorDef = {
  topicId: 'inverse-trig',
  version: 3,
  templates: ['arcsin', 'arccos', 'arctan'],
  generate: (ctx) => {
    const chosen = ctx.pick(INVERSE_CASES);
    const v = SPECIAL_TRIG[chosen.angle][chosen.func];
    return {
      templateId: `arc${chosen.func}`,
      problemText: `Evaluate in degrees: $\\${chosen.func}^{-1}\\left(${v.latex}\\right)$`,
      answer: degrees(chosen.angle),
      displayAnswer: `$${chosen.angle}°$`,
      explanation: `$\\${chosen.func}(${chosen.angle}°) = ${v.latex}$ and $${chosen.angle}°$ lies in the principal range $${chosen.range}$ of $\\${chosen.func}^{-1}$, so $\\${chosen.func}^{-1}\\left(${v.latex}\\right) = ${chosen.angle}°$.`,
      hint: `Which special angle has ${chosen.func} = ${v.text}?`,
    };
  },
};
