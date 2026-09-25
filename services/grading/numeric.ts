/**
 * Numeric answers typed by students.
 */
import { parse, MathNode } from 'mathjs';
import { normalizeMathExpr, freeVariablesOf } from './normalize';
import { compile, evalReal } from './sampling';

/**
 * Required written form of a numeric answer.
 *  - 'any' (default): any exact constant expression denoting the value
 *    (0.75, 3/4, sqrt(3)/2, pi/4, e^0.5/384, (7+5)/2).
 *  - 'evaluated': for arithmetic-fluency problems, where the arithmetic IS
 *    the skill. Fractions of numbers and exact irrational forms are still
 *    allowed, but +, −, × or ^ applied to two plain numbers restates the
 *    problem ("7+5", "7*5", "3^2") and is not an answer.
 */
export type NumberForm = 'any' | 'evaluated';

interface OperatorLike { op: string; fn: string; args: MathNode[] }

/** A subtree made only of numeric literals (with parentheses / unary sign). */
const isPureNumber = (n: MathNode): boolean => {
  if (n.type === 'ConstantNode') return true;
  if (n.type === 'ParenthesisNode') return isPureNumber((n as unknown as { content: MathNode }).content);
  if (n.type === 'OperatorNode') {
    const o = n as unknown as OperatorLike;
    if ((o.fn === 'unaryMinus' || o.fn === 'unaryPlus') && o.args.length === 1) return isPureNumber(o.args[0]);
  }
  return false;
};

/** True when any +, −, × or ^ combines two plain numbers (a/b is a fraction and stays allowed). */
export const restatesArithmetic = (node: MathNode): boolean => {
  let found = false;
  node.traverse((n) => {
    if (found || n.type !== 'OperatorNode') return;
    const o = n as unknown as OperatorLike;
    if (o.args.length === 2 && ['+', '-', '*', '^'].includes(o.op) && o.args.every(isPureNumber)) found = true;
  });
  return found;
};

/**
 * Parse a numeric answer: decimals, fractions ("3/5"), and constant
 * expressions ("sqrt(3)/2", "pi/4"). Returns null for anything that is not a
 * finite real constant, or that violates the required form.
 */
export const parseNumericInput = (raw: string, form: NumberForm = 'any'): number | null => {
  const s = raw.trim().replace(/,/g, '').replace(/[−–]/g, '-');
  if (!s) return null;
  if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(s)) return parseFloat(s);
  const frac = s.match(/^([+-]?\d+(?:\.\d+)?)\s*\/\s*([+-]?\d+(?:\.\d+)?)$/);
  if (frac) {
    const den = parseFloat(frac[2]);
    if (den === 0) return null;
    return parseFloat(frac[1]) / den;
  }
  const normalized = normalizeMathExpr(s);
  if (!normalized || normalized.includes('=') || /[<>≤≥]/.test(normalized)) return null;
  let node: MathNode;
  try {
    node = parse(normalized);
    if (freeVariablesOf(node).length !== 0) return null;
  } catch {
    return null;
  }
  if (form === 'evaluated' && restatesArithmetic(node)) return null;
  const c = compile(normalized);
  return c ? evalReal(c, {}) : null;
};

/** Exact numeric comparison with a floating-point margin only. */
export const numbersEqual = (a: number, b: number): boolean =>
  Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

/** Tolerance implied by "round to N decimal places": half a unit in the last place. */
export const roundingTolerance = (decimalPlaces: number): number =>
  0.5 * Math.pow(10, -decimalPlaces) + 1e-9;
