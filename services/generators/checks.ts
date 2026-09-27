/**
 * Structural checks run on every draft before it becomes a Problem.
 *
 * These are not properties of an unlucky random draw (those are the named
 * invariants a generator states with ctx.require); a failure here means the
 * generator is broken, so the registry throws instead of retrying.
 */
import { parse } from 'mathjs';
import type { AnswerSpec } from '../../types';
import { gcd } from './context';
import type { Draft } from './context';
import { normalizeMathExpr, normalizeWord } from '../grading/normalize';

const parses = (expr: string): boolean => {
  try {
    const n = normalizeMathExpr(expr);
    if (!n) return false;
    parse(n);
    return true;
  } catch {
    return false;
  }
};

/** Problems with a spec (and its sub-specs), as human-readable strings. */
export const checkSpec = (spec: AnswerSpec, path = 'answer'): string[] => {
  const out: string[] = [];
  const bad = (msg: string) => out.push(`${path}: ${msg}`);
  switch (spec.kind) {
    case 'number': {
      if (Number.isNaN(spec.value) || (!Number.isFinite(spec.value) && !spec.extended)) bad(`value ${spec.value} is not a finite number (set extended for ±∞)`);
      const t = spec.tolerance;
      if (t.kind === 'decimalPlaces' && !(Number.isInteger(t.places) && t.places >= 0)) bad('decimal places must be a nonnegative integer');
      if (t.kind === 'significantFigures' && !(Number.isInteger(t.figures) && t.figures >= 1)) bad('significant figures must be a positive integer');
      if ((t.kind === 'absolute' || t.kind === 'relative') && !(t.tol > 0 && Number.isFinite(t.tol))) bad('tolerance must be positive');
      break;
    }
    case 'fraction':
      if (!Number.isInteger(spec.numerator) || !Number.isInteger(spec.denominator)) bad('numerator and denominator must be integers');
      else if (spec.denominator <= 0) bad('denominator must be positive');
      else if (gcd(spec.numerator, spec.denominator) !== 1 && !(spec.numerator === 0 && spec.denominator === 1)) bad('fraction must be stored in lowest terms');
      break;
    case 'expression':
      if (!parses(spec.reference)) bad(`reference "${spec.reference}" does not parse`);
      if (spec.forbid) {
        // the reference itself must satisfy its form constraints
        const node = parse(normalizeMathExpr(spec.reference));
        node.traverse((n) => {
          if (n.type !== 'FunctionNode') return;
          const f = n as unknown as { fn: { name: string }; args: { type: string }[] };
          if (spec.forbid!.functions?.includes(f.fn.name)) bad(`reference uses forbidden function ${f.fn.name}`);
          if (spec.forbid!.simpleArguments && f.args.some(a => a.type !== 'SymbolNode')) bad('reference applies a function to a compound argument');
        });
      }
      for (const iv of spec.domain?.intervals ?? []) if (!(iv.lo <= iv.hi)) bad('domain interval with lo > hi');
      break;
    case 'equation':
      if (!parses(spec.lhs) || !parses(spec.rhs)) bad(`equation "${spec.lhs} = ${spec.rhs}" does not parse`);
      break;
    case 'interval':
      if (!spec.variable) bad('interval without a variable');
      for (const iv of spec.set) {
        if (Number.isNaN(iv.lo) || Number.isNaN(iv.hi) || !(iv.lo <= iv.hi)) bad(`invalid interval [${iv.lo}, ${iv.hi}]`);
        if ((iv.loClosed && !Number.isFinite(iv.lo)) || (iv.hiClosed && !Number.isFinite(iv.hi))) bad('an infinite endpoint cannot be closed');
      }
      break;
    case 'finiteSet':
      if (spec.elements.some(e => !Number.isFinite(e))) bad('set elements must be finite');
      if (new Set(spec.elements).size !== spec.elements.length) bad('set elements must be distinct');
      break;
    case 'antiderivative':
      if (!parses(spec.integrand)) bad(`integrand "${spec.integrand}" does not parse`);
      if (spec.reference !== undefined && !parses(spec.reference)) bad(`reference "${spec.reference}" does not parse`);
      if (!/^[a-z]$/i.test(spec.variable)) bad('variable must be a single letter');
      break;
    case 'choice': {
      const options = spec.options.map(normalizeWord);
      if (options.length < 2) bad('a choice needs at least two options');
      if (new Set(options).size !== options.length) bad('choice options must be distinct');
      if (!options.includes(normalizeWord(spec.answer))) bad(`answer "${spec.answer}" is not one of the options`);
      break;
    }
    case 'text':
      if (spec.accepted.length === 0 || spec.accepted.some(a => !a.trim())) bad('text answers need nonempty accepted words');
      break;
    case 'multipart':
      if (spec.parts.length === 0) bad('multipart answer without parts');
      spec.parts.forEach((part, i) => {
        if (part.spec) out.push(...checkSpec(part.spec, `${path}.parts[${i}]`));
        if (part.when) {
          const target = spec.parts[part.when.part];
          if (part.when.part >= i || !target) bad(`part ${i} depends on a later or missing part`);
          else if (target.spec?.kind !== 'choice') bad(`part ${i} depends on a part that is not a choice`);
          else if (!target.spec.options.map(normalizeWord).includes(normalizeWord(part.when.equals))) bad(`part ${i} depends on "${part.when.equals}", which is not an option`);
        }
      });
      break;
    case 'anyOf':
      if (spec.options.length === 0) bad('anyOf without options');
      if (new Set(spec.options.map(o => o.kind)).size > 1) bad('anyOf options must share one kind (the input controls follow it)');
      spec.options.forEach((o, i) => out.push(...checkSpec(o, `${path}.options[${i}]`)));
      break;
  }
  return out;
};

/**
 * Text that should never reach a student. "undefined" and "null" are also
 * English words ("ln(cos x) is undefined there"), so they count only inside
 * math, where they can only be leaked JavaScript values.
 */
const LEAKED_VALUE = /\b(NaN|Infinity)\b|\[object /;
const LEAKED_IN_MATH = /\b(NaN|undefined|Infinity|null)\b|\[object /;

/** Textbook-format slips inside math: "+ -3", "- -3", a coefficient of 1 written out. */
const FORMAT_SLIPS: [RegExp, string][] = [
  [/[+-]\s+-\s*\d/, 'a sign followed by a negative number ("+ -3"); write "- 3" or parenthesize'],
  [/(^|[^\d.\\a-z{])1x\b/, 'a coefficient of 1 written out ("1x")'],
  [/=\s*;\s*\?/, 'a lost LaTeX escape ("= ;?" where "= \\;?" was meant)'],
];

const mathSegments = (text: string): string[] =>
  [...text.matchAll(/\$([^$]*)\$/g)].map(m => m[1]);

const checkText = (text: string, field: string): string[] => {
  const out: string[] = [];
  if (LEAKED_VALUE.test(text)) out.push(`${field}: contains a leaked non-value ("${text.match(LEAKED_VALUE)![0]}")`);
  const dollars = (text.match(/(?<!\\)\$/g) ?? []).length;
  if (dollars % 2 !== 0) out.push(`${field}: unbalanced $ delimiters`);
  for (const seg of mathSegments(text)) {
    if (LEAKED_IN_MATH.test(seg)) out.push(`${field}: contains a leaked non-value in $${seg}$`);
    const open = (seg.match(/(?<!\\)\{/g) ?? []).length;
    const close = (seg.match(/(?<!\\)\}/g) ?? []).length;
    if (open !== close) out.push(`${field}: unbalanced braces in $${seg}$`);
    for (const [re, what] of FORMAT_SLIPS) if (re.test(seg)) out.push(`${field}: ${what} in $${seg}$`);
  }
  return out;
};

export const checkDraft = (draft: Draft): string[] => {
  const out: string[] = [];
  if (!draft.templateId) out.push('templateId is empty');
  if (!draft.problemText.trim()) out.push('problemText is empty');
  if (!draft.explanation.trim()) out.push('explanation is empty');
  out.push(...checkText(draft.problemText, 'problemText'));
  out.push(...checkText(draft.explanation, 'explanation'));
  if (draft.displayAnswer !== undefined) out.push(...checkText(draft.displayAnswer, 'displayAnswer'));
  if (draft.hint !== undefined) out.push(...checkText(draft.hint, 'hint'));
  for (const [i, st] of (draft.solution ?? []).entries()) {
    if (st.kind === 'step') {
      if (!st.text.trim()) out.push(`solution[${i}]: empty step`);
      out.push(...checkText(st.text, `solution[${i}]`));
    } else {
      if (!st.name.trim()) out.push(`solution[${i}]: theorem without a name`);
      if (st.hypotheses.length === 0) out.push(`solution[${i}]: ${st.name} applied without stating its hypotheses`);
      for (const h of st.hypotheses) {
        if (!h.condition.trim() || !h.check.trim()) out.push(`solution[${i}]: ${st.name}: a hypothesis without its check`);
        out.push(...checkText(h.condition, `solution[${i}].condition`), ...checkText(h.check, `solution[${i}].check`));
      }
      out.push(...checkText(st.conclusion, `solution[${i}].conclusion`));
    }
  }
  out.push(...checkSpec(draft.answer));
  return out;
};
