/**
 * grade(spec, input): the one interpreter of the answer contract.
 *
 * `input` is what the student typed: a string, or one string per part for
 * multipart answers. Every answer kind in AnswerSpec is handled here and only
 * here, so a generator cannot ship an answer the grader does not understand
 * (the switch is exhaustive at compile time).
 */
import type { AnswerSpec, NumericTolerance, AnswerPartSpec } from '../../types';
import { expressionsEquivalent, isAntiderivative } from './equivalence';
import { parseNumericInput, numbersEqual } from './numeric';
import { parse } from 'mathjs';
import type { MathNode } from 'mathjs';
import { normalizeMathExpr, normalizeWord } from './normalize';
import { parseIntervalSet, intervalSetsEqual, parseFiniteSet, finiteSetsEqual } from './sets';

export type AnswerInput = string | string[];

export interface GradeContext {
  /** Problem seed for sample points (default: derived from the reference). */
  seedKey?: string;
}

const FLOAT_GUARD = 1e-9;

/** Largest allowed |input − value| for a tolerance policy. */
export const toleranceFor = (tol: NumericTolerance, value: number): number => {
  switch (tol.kind) {
    case 'exact': return FLOAT_GUARD * Math.max(1, Math.abs(value));
    case 'decimalPlaces': return 0.5 * Math.pow(10, -tol.places) + FLOAT_GUARD;
    case 'significantFigures': {
      if (value === 0) return 0.5 * Math.pow(10, -tol.figures) + FLOAT_GUARD;
      const magnitude = Math.floor(Math.log10(Math.abs(value)));
      return 0.5 * Math.pow(10, magnitude - tol.figures + 1) + FLOAT_GUARD * Math.abs(value);
    }
    case 'absolute': return tol.tol;
    case 'relative': return tol.tol * Math.abs(value);
  }
};

/** Whether an expression uses a forbidden function, or applies a function to a compound argument. */
const violatesForm = (input: string, forbid: { functions?: string[]; simpleArguments?: boolean }): boolean => {
  let node: MathNode;
  try {
    node = parse(normalizeMathExpr(input));
  } catch {
    return false; // unparseable: the equivalence check rejects it
  }
  let bad = false;
  node.traverse((n) => {
    if (bad || n.type !== 'FunctionNode') return;
    const f = n as unknown as { fn: { name: string }; args: MathNode[] };
    if (forbid.functions?.includes(f.fn.name)) bad = true;
    else if (forbid.simpleArguments && f.args.some(a => a.type !== 'SymbolNode')) bad = true;
  });
  return bad;
};

/** "∞", "inf", "infinity", "+∞" → Infinity; "-∞" … → -Infinity; anything else → null. */
export const parseInfinity = (raw: string): number | null => {
  const s = raw.trim().toLowerCase().replace(/\s+/g, '').replace(/[−–]/g, '-');
  const m = s.match(/^([+-]?)(∞|inf|infinity|oo)$/);
  if (!m) return null;
  return m[1] === '-' ? -Infinity : Infinity;
};

const assertNever = (x: never): never => { throw new Error(`unhandled answer kind: ${JSON.stringify(x)}`); };

const bigGcd = (a: bigint, b: bigint): bigint => {
  a = a < 0n ? -a : a; b = b < 0n ? -b : b;
  while (b !== 0n) { const t = a % b; a = b; b = t; }
  return a;
};

const gradeFraction = (spec: { numerator: number; denominator: number; lowestTerms?: boolean }, input: string): boolean => {
  const trimmed = input.trim().replace(/[−–]/g, '-');
  const m = trimmed.match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
  if (!m) {
    const whole = trimmed.match(/^(-?\d+)$/);
    return !!whole && spec.denominator === 1 && parseInt(whole[1], 10) === spec.numerator;
  }
  const n = BigInt(m[1]);
  const d = BigInt(m[2]);
  if (d === 0n) return false;
  if (spec.lowestTerms && (bigGcd(n, d) !== 1n || d < 0n)) return false;
  // n/d = N/D  ⇔  n·D = N·d, in exact integer arithmetic
  return n * BigInt(spec.denominator) === BigInt(spec.numerator) * d;
};

/** Whether part i applies, given one value per part (reference answers or inputs). */
export const partIsActive = (parts: AnswerPartSpec[], i: number, values: (string | null | undefined)[]): boolean => {
  const cond = parts[i].when;
  if (!cond) return true;
  const v = values[cond.part];
  return v !== null && v !== undefined && normalizeWord(v) === normalizeWord(cond.equals);
};

/** The choice value a part's reference answer selects, for `when` conditions. */
const referenceChoice = (spec: AnswerSpec | null): string | null =>
  spec && spec.kind === 'choice' ? spec.answer : null;

export const grade = (spec: AnswerSpec, input: AnswerInput, ctx: GradeContext = {}): boolean => {
  if (spec.kind === 'multipart') {
    if (!Array.isArray(input)) return false;
    const parts = spec.parts;
    const reference = parts.map(p => referenceChoice(p.spec));
    return parts.every((part, i) => {
      if (!partIsActive(parts, i, reference)) return true;   // not asked of the correct answer
      if (!partIsActive(parts, i, input)) return false;      // the student's own choices skipped it
      if (part.spec === null) return true;
      return grade(part.spec, input[i] ?? '', ctx);
    });
  }
  if (spec.kind === 'anyOf') return spec.options.some(option => grade(option, input, ctx));
  if (Array.isArray(input)) return false;

  switch (spec.kind) {
    case 'number': {
      const typed = spec.unit === 'degree' ? input.trim().replace(/\s*(°|deg|degrees)$/i, '') : input;
      if (spec.extended) {
        const inf = parseInfinity(typed);
        if (inf !== null || !Number.isFinite(spec.value)) return inf !== null && inf === spec.value;
      }
      const v = parseNumericInput(typed, spec.form ?? 'any');
      return v !== null && Math.abs(v - spec.value) <= toleranceFor(spec.tolerance, spec.value);
    }
    case 'fraction':
      return gradeFraction(spec, input);
    case 'expression': {
      if (spec.forbid && violatesForm(input.replace(/^\s*[a-zA-Z]\s*=/, ''), spec.forbid)) return false;
      const opts = {
        parameters: spec.parameters, seedKey: ctx.seedKey, domain: spec.domain, domainPolicy: spec.domainPolicy,
      };
      const assigned = input.match(/^\s*([a-zA-Z])\s*=(.*)$/);
      if (assigned && spec.assignable?.includes(assigned[1].toLowerCase())) {
        return expressionsEquivalent(assigned[2], spec.reference, opts);
      }
      return expressionsEquivalent(input, spec.reference, opts);
    }
    case 'equation':
      return expressionsEquivalent(input, `${spec.lhs}=${spec.rhs}`, { parameters: spec.parameters, seedKey: ctx.seedKey })
        && /=/.test(input);
    case 'interval': {
      const set = parseIntervalSet(input, spec.variable);
      return set !== null && intervalSetsEqual(set, spec.set);
    }
    case 'finiteSet': {
      const set = parseFiniteSet(input);
      return set !== null && finiteSetsEqual(set, spec.elements);
    }
    case 'antiderivative':
      return isAntiderivative(input, spec.integrand, { variable: spec.variable, reference: spec.reference, seedKey: ctx.seedKey });
    case 'choice': {
      const chosen = normalizeWord(input);
      return spec.options.map(normalizeWord).includes(chosen) && chosen === normalizeWord(spec.answer);
    }
    case 'text':
      return spec.accepted.map(normalizeWord).includes(normalizeWord(input));
    default:
      return assertNever(spec);
  }
};

export { numbersEqual };
