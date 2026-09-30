/**
 * Helpers derived from an AnswerSpec:
 *  - canonicalInput: a correct answer exactly as a student could type it
 *  - wrongInputs: answers that must be rejected (for tests, the research
 *    harness and the generator seed sweep)
 *  - displayOf: MathText/LaTeX for feedback when a problem has no displayAnswer
 *  - referenceNumber: the numeric value of a numeric answer
 */
import { parse } from 'mathjs';
import type { AnswerSpec, Interval } from '../../types';
import { freeVariables, normalizeMathExpr } from './normalize';

const num = (v: number): string => (Number.isInteger(v) ? String(v) : String(v));

const endpoint = (v: number): string => (v === Infinity ? 'inf' : v === -Infinity ? '-inf' : num(v));

const intervalText = (iv: Interval): string =>
  `${iv.loClosed ? '[' : '('}${endpoint(iv.lo)}, ${endpoint(iv.hi)}${iv.hiClosed ? ']' : ')'}`;

/** Inequality text for a single ray, interval notation otherwise. */
const setText = (variable: string, set: Interval[]): string => {
  if (set.length === 1) {
    const [iv] = set;
    if (!Number.isFinite(iv.lo) && Number.isFinite(iv.hi)) return `${variable} ${iv.hiClosed ? '<=' : '<'} ${num(iv.hi)}`;
    if (Number.isFinite(iv.lo) && !Number.isFinite(iv.hi)) return `${variable} ${iv.loClosed ? '>=' : '>'} ${num(iv.lo)}`;
  }
  return set.map(intervalText).join(' U ');
};

const firstVariable = (expr: string): string => {
  try {
    return freeVariables(normalizeMathExpr(expr))[0] ?? 'x';
  } catch {
    return 'x';
  }
};

export const canonicalInput = (spec: AnswerSpec): string | string[] => {
  switch (spec.kind) {
    case 'number':
      if (!Number.isFinite(spec.value)) return spec.value > 0 ? 'infinity' : '-infinity';
      return spec.tolerance.kind === 'decimalPlaces' ? spec.value.toFixed(spec.tolerance.places) : num(spec.value);
    case 'limit':
      if (spec.value === null) return 'DNE';
      return canonicalInput({ kind: 'number', value: spec.value, tolerance: spec.tolerance, extended: true });
    case 'fraction': return `${spec.numerator}/${spec.denominator}`;
    case 'expression': return spec.reference;
    case 'equation': return `${spec.lhs} = ${spec.rhs}`;
    case 'interval': return setText(spec.variable, spec.set);
    case 'finiteSet': return spec.elements.map(num).join(', ');
    case 'antiderivative':
      if (!spec.reference) throw new Error('antiderivative spec without a reference has no canonical input');
      return spec.reference;
    case 'choice': return spec.answer;
    case 'text': return spec.accepted[0];
    case 'multipart':
      return spec.parts.map(p => (p.spec === null ? '' : (canonicalInput(p.spec) as string)));
    case 'anyOf': return canonicalInput(spec.options[0]);
  }
};

/** Inputs that must be rejected. Every spec kind yields at least one. */
export const wrongInputs = (spec: AnswerSpec): (string | string[])[] => {
  switch (spec.kind) {
    case 'number': {
      if (!Number.isFinite(spec.value)) return [spec.value > 0 ? '-infinity' : 'infinity', '0', '1', '10^6', 'NaN'];
      const out = [num(spec.value + 1), num(spec.value - 1), 'NaN', '0/0'];
      if (spec.extended) out.push('infinity');
      if (spec.tolerance.kind === 'decimalPlaces') {
        const unit = Math.pow(10, -spec.tolerance.places);
        out.push((Number(spec.value.toFixed(spec.tolerance.places)) + 2 * unit).toFixed(spec.tolerance.places));
      }
      return out;
    }
    case 'limit': {
      if (spec.value === null) return ['0', 'infinity', '-infinity', 'diverges'];
      if (!Number.isFinite(spec.value)) return [spec.value > 0 ? '-infinity' : 'infinity', 'DNE', '0', 'diverges'];
      return [...wrongInputs({ kind: 'number', value: spec.value, tolerance: spec.tolerance, extended: true }), 'DNE', 'converges'];
    }
    case 'fraction': {
      // off by one, and off by one unit in the numerator (never equal to the value, even for 0)
      const out = [`${spec.numerator + spec.denominator}/${spec.denominator}`, `${spec.numerator + 1}/${spec.denominator}`];
      if (spec.numerator !== 0) out.push(`${-spec.numerator}/${spec.denominator}`);
      return out;
    }
    case 'expression': {
      const v = firstVariable(spec.reference);
      return [`(${spec.reference})+${v}^7`, `(${spec.reference})+1`, '0/0'];
    }
    case 'equation':
      return [`${spec.lhs} = (${spec.rhs})+1`, `${spec.lhs} = 7*(${spec.rhs})`, `(${spec.lhs})^2 = (${spec.rhs})^2+1`];
    case 'interval': {
      const flipped = spec.set.map(iv => ({
        ...iv,
        loClosed: Number.isFinite(iv.lo) ? !iv.loClosed : false,
        hiClosed: Number.isFinite(iv.hi) ? !iv.hiClosed : false,
      }));
      const shifted = spec.set.map(iv => ({ ...iv, lo: iv.lo + 1, hi: iv.hi + 1 }));
      return [setText(spec.variable, flipped), setText(spec.variable, shifted)];
    }
    case 'finiteSet': {
      const max = spec.elements.length ? Math.max(...spec.elements) : 0;
      return [[...spec.elements, max + 1].map(num).join(', '), spec.elements.map(e => num(e + 1)).join(', ') || '0'];
    }
    case 'antiderivative': {
      const base = spec.reference ?? spec.integrand;
      return [`(${base})+${spec.variable}^7`, spec.integrand, `(${base})*2+${spec.variable}`];
    }
    case 'choice': return spec.options.filter(o => o !== spec.answer);
    case 'text': return ['wronganswer'];
    case 'multipart': {
      const correct = canonicalInput(spec) as string[];
      const out: string[][] = [];
      spec.parts.forEach((p, i) => {
        if (p.spec === null) return;
        for (const wrong of wrongInputs(p.spec)) {
          if (typeof wrong === 'string') out.push(correct.map((v, j) => (j === i ? wrong : v)));
        }
      });
      // an applicable part left blank
      spec.parts.forEach((p, i) => {
        if (p.spec !== null && p.spec.kind !== 'choice') out.push(correct.map((v, j) => (j === i ? '' : v)));
      });
      return out;
    }
    case 'anyOf': return wrongInputs(spec.options[0]);
  }
};

/** Numeric value of a number/fraction answer (first option of anyOf), else null. */
export const referenceNumber = (spec: AnswerSpec): number | null => {
  switch (spec.kind) {
    case 'number': return spec.value;
    case 'limit': return spec.value;
    case 'fraction': return spec.numerator / spec.denominator;
    case 'anyOf': return referenceNumber(spec.options[0]);
    default: return null;
  }
};

const tex = (expr: string): string => {
  try {
    return parse(normalizeMathExpr(expr)).toTex({ parenthesis: 'auto', implicit: 'hide' });
  } catch {
    return expr;
  }
};

const texNumber = (v: number): string => (Number.isInteger(v) ? String(v) : String(Number(v.toPrecision(10))));

const texInterval = (variable: string, set: Interval[]): string => {
  const v = variable === 'theta' ? '\\theta' : variable;
  if (set.length === 1) {
    const [iv] = set;
    if (!Number.isFinite(iv.lo) && Number.isFinite(iv.hi)) return `${v} ${iv.hiClosed ? '\\leq' : '<'} ${texNumber(iv.hi)}`;
    if (Number.isFinite(iv.lo) && !Number.isFinite(iv.hi)) return `${v} ${iv.loClosed ? '\\geq' : '>'} ${texNumber(iv.lo)}`;
  }
  const e = (x: number) => (x === Infinity ? '\\infty' : x === -Infinity ? '-\\infty' : texNumber(x));
  return set.map(iv => `${iv.loClosed ? '[' : '('}${e(iv.lo)}, ${e(iv.hi)}${iv.hiClosed ? ']' : ')'}`).join(' \\cup ');
};

export const displayOf = (spec: AnswerSpec): string => {
  switch (spec.kind) {
    case 'number':
      if (!Number.isFinite(spec.value)) return spec.value > 0 ? '$\\infty$' : '$-\\infty$';
      return spec.tolerance.kind === 'decimalPlaces'
        ? `$${spec.value.toFixed(spec.tolerance.places)}$`
        : `$${texNumber(spec.value)}$`;
    case 'limit':
      return spec.value === null ? 'Does not exist' : displayOf({ kind: 'number', value: spec.value, tolerance: spec.tolerance, extended: true });
    case 'fraction':
      return spec.denominator === 1 ? `$${spec.numerator}$`
        : `$${spec.numerator < 0 ? '-' : ''}\\frac{${Math.abs(spec.numerator)}}{${spec.denominator}}$`;
    case 'expression': return `$${tex(spec.reference)}$`;
    case 'equation': return `$${tex(spec.lhs)} = ${tex(spec.rhs)}$`;
    case 'interval': return `$${texInterval(spec.variable, spec.set)}$`;
    case 'finiteSet': return spec.elements.length === 0 ? '$\\varnothing$' : `$\\{${spec.elements.map(texNumber).join(', ')}\\}$`;
    case 'antiderivative': return `$${tex(spec.reference ?? `integral of ${spec.integrand}`)} + C$`;
    case 'choice': return spec.answer.charAt(0).toUpperCase() + spec.answer.slice(1);
    case 'text': return spec.accepted[0];
    case 'multipart':
      return spec.parts.filter(p => p.spec !== null).map(p => `${p.label}: ${displayOf(p.spec!)}`).join('; ');
    case 'anyOf': return spec.options.map(displayOf).join(' or ');
  }
};
