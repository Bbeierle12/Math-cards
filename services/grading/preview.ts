/**
 * How the grader reads a typed answer, as LaTeX, so grouping and function
 * application are visible before submission ("√3/2" reads as √3 / 2, not
 * √(3/2)). Purely interpretive: a preview never says whether an answer is
 * right, and it reads the input with the same normalizer and parsers that
 * grade() uses.
 */
import { parse, type MathNode } from 'mathjs';
import type { AnswerSpec, Interval } from '../../types';
import { normalizeMathExpr } from './normalize';
import { parseInfinity } from './grade';
import { finiteSetItems, parseIntervalSet } from './sets';

export type Preview = { tex: string } | { error: string } | null;

const INCOMPLETE = 'Not a complete expression yet';

/** Names mathjs would print as plain symbols but that have a standard form. */
const SYMBOL_TEX: Record<string, string> = { infinity: '\\infty', inf: '\\infty', theta: '\\theta', pi: '\\pi' };

const texHandler = (node: MathNode): string | undefined => {
  if (node.type === 'SymbolNode') {
    const name = (node as unknown as { name: string }).name;
    return SYMBOL_TEX[name];
  }
  return undefined;
};

/** LaTeX of one typed expression as the grader parses it, or null when it does not parse. */
export const expressionTex = (raw: string): string | null => {
  try {
    return parse(normalizeMathExpr(raw)).toTex({ parenthesis: 'keep', implicit: 'show', handler: texHandler });
  } catch {
    return null;
  }
};

const endpointTex = (v: number): string => (v === Infinity ? '\\infty' : v === -Infinity ? '-\\infty' : `${Number(v.toPrecision(12))}`);

const intervalTex = (iv: Interval): string =>
  `${iv.loClosed ? '[' : '('}${endpointTex(iv.lo)}, ${endpointTex(iv.hi)}${iv.hiClosed ? ']' : ')'}`;

/** The spec that decides how input is read: anyOf options share one kind. */
const readingSpec = (spec: AnswerSpec): AnswerSpec => (spec.kind === 'anyOf' ? readingSpec(spec.options[0]) : spec);

const fromTex = (tex: string | null): Preview => (tex === null ? { error: INCOMPLETE } : { tex });

/**
 * The preview for one typed input. `spec` null is a numeric part asked only
 * for some answers (e.g. the limit of a sequence that might diverge); it is
 * read like any number. Null when there is nothing to preview (empty input,
 * buttons, fraction boxes, words).
 */
export const previewInput = (spec: AnswerSpec | null, input: string): Preview => {
  if (!input.trim()) return null;
  const s = spec === null ? null : readingSpec(spec);
  if (s === null || s.kind === 'number') {
    const n = s?.kind === 'number' ? s : null;
    const degree = n?.unit === 'degree';
    const typed = degree ? input.trim().replace(/\s*(°|deg|degrees)$/i, '') : input;
    if (n?.extended) {
      const inf = parseInfinity(typed);
      if (inf !== null) return { tex: inf > 0 ? '\\infty' : '-\\infty' };
    }
    const tex = expressionTex(typed);
    return tex === null ? { error: INCOMPLETE } : { tex: degree ? `${tex}^{\\circ}` : tex };
  }
  switch (s.kind) {
    case 'expression':
    case 'antiderivative': {
      const assigned = input.match(/^\s*([a-zA-Z])\s*=(.*)$/);
      if (s.kind === 'expression' && assigned && s.assignable?.includes(assigned[1].toLowerCase())) {
        const rhs = expressionTex(assigned[2]);
        return rhs === null ? { error: INCOMPLETE } : { tex: `${assigned[1]} = ${rhs}` };
      }
      return fromTex(expressionTex(input));
    }
    case 'equation': {
      const sides = input.split('=');
      if (sides.length !== 2) return { error: sides.length === 1 ? 'An equation needs one "=" sign' : 'Use one "=" sign' };
      const [l, r] = sides.map(expressionTex);
      return l === null || r === null ? { error: INCOMPLETE } : { tex: `${l} = ${r}` };
    }
    case 'interval': {
      const set = parseIntervalSet(input, s.variable);
      if (set === null) return { error: `Not read as a set of $${s.variable}$ values yet` };
      return { tex: set.map(intervalTex).join(' \\cup ') };
    }
    case 'finiteSet': {
      const items = finiteSetItems(input);
      if (items === null) return { error: INCOMPLETE };
      if (items.length === 0) return { tex: '\\varnothing' };
      const texs = items.map(expressionTex);
      return texs.some(t => t === null) ? { error: INCOMPLETE } : { tex: `\\left\\{${texs.join(', ')}\\right\\}` };
    }
    default:
      return null;
  }
};
