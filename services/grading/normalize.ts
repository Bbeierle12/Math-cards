/**
 * Student notation → mathjs syntax. Pure string transformations plus small
 * AST helpers shared by every grading module.
 */
import { parse, MathNode } from 'mathjs';

const FUNCTION_NAMES = ['arcsin', 'arccos', 'arctan', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh',
  'sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'ln', 'log', 'sqrt', 'exp', 'abs'];
const FN_ALT = FUNCTION_NAMES.join('|');

/** Symbols mathjs treats as constants; any other bare symbol is a free variable. */
export const CONSTANTS = new Set(['pi', 'e', 'i']);
/** Single symbols we recognise as variables, so they are not mistaken for word answers. */
const VARIABLE_WORDS = new Set(['x', 'y', 't', 'u', 'n', 'p', 'c', 'theta']);

/** Move `fn^n(` exponents behind the matching parenthesis: sin^2(x) -> (sin(x))^2. */
const hoistFunctionPowers = (s: string): string => {
  const re = new RegExp(`(${FN_ALT})\\^(\\d+)\\(`);
  let m: RegExpExecArray | null;
  let guard = 0;
  while ((m = re.exec(s)) !== null && guard++ < 50) {
    const start = m.index;
    const openIdx = start + m[0].length - 1;
    let depth = 0;
    let closeIdx = -1;
    for (let i = openIdx; i < s.length; i++) {
      if (s[i] === '(') depth++;
      else if (s[i] === ')') {
        depth--;
        if (depth === 0) { closeIdx = i; break; }
      }
    }
    if (closeIdx === -1) break; // unbalanced; leave for the parser to reject
    const inner = s.slice(openIdx, closeIdx + 1);
    s = `${s.slice(0, start)}(${m[1]}${inner})^${m[2]}${s.slice(closeIdx + 1)}`;
  }
  return s;
};

/** Normalize student notation into mathjs syntax. */
export const normalizeMathExpr = (raw: string): string => {
  let s = raw.trim().toLowerCase().replace(/\s+/g, '');
  s = s
    .replace(/²/g, '^2').replace(/³/g, '^3').replace(/⁴/g, '^4').replace(/⁵/g, '^5')
    .replace(/[·×]/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-').replace(/\*\*/g, '^')
    .replace(/θ/g, 'theta').replace(/π/g, 'pi').replace(/√/g, 'sqrt').replace(/∞/g, 'infinity')
    .replace(/<=/g, '≤').replace(/>=/g, '≥');
  // |expr| -> (abs(expr)) (non-nested); the outer parentheses keep "ln|u|" parseable as ln(...)
  s = s.replace(/\|([^|]+)\|/g, '(abs($1))');
  // fn^n theta / fn^n x  -> fn(theta)^n
  s = s.replace(new RegExp(`(${FN_ALT})\\^(\\d+)(theta|x)(?![a-z])`, 'g'), '$1($3)^$2');
  // fn theta / fn x (no parentheses) -> fn(theta)
  s = s.replace(new RegExp(`(${FN_ALT})(theta|x)(?![a-z])`, 'g'), '$1($2)');
  // sin^2(x) -> (sin(x))^2
  s = hoistFunctionPowers(s);
  // implicit multiplication the mathjs parser does not resolve on its own
  s = s.replace(/(?<![a-z])(x|theta)(?=[a-z(])/g, '$1*');   // xsin(x), xe^x, x(ln(x)-1)
  s = s.replace(/\)(?=[a-z0-9(])/g, ')*');                   // (x-1)e^x, sec(x)tan(x)
  s = s.replace(/(\d)(?=\()/g, '$1*');                         // 2(x+1)
  // natural log and inverse-trig aliases
  s = s.replace(/(?<![a-z])ln\(/g, 'log(');
  s = s.replace(/(?<![a-z])arc(sin|cos|tan)\(/g, 'a$1(');
  return s;
};

const isFunctionName = (path: string | null, parent: MathNode | null): boolean =>
  !!parent && parent.type === 'FunctionNode' && path === 'fn';

/** Free variables of a parsed expression, in first-occurrence order. */
export const freeVariablesOf = (node: MathNode): string[] => {
  const vars = new Set<string>();
  node.traverse((n, path, parent) => {
    if (n.type === 'SymbolNode' && !isFunctionName(path, parent)) {
      const name = (n as unknown as { name: string }).name;
      if (!CONSTANTS.has(name)) vars.add(name);
    }
  });
  return [...vars];
};

/** Free variables of a normalized expression string. Throws if it does not parse. */
export const freeVariables = (normalized: string): string[] => freeVariablesOf(parse(normalized));

/** Rename free variables (never function names) according to `mapping`. */
export const renameVariables = (normalized: string, mapping: Record<string, string>): string => {
  const node = parse(normalized).transform((n, path, parent) => {
    if (n.type === 'SymbolNode' && !isFunctionName(path, parent)) {
      const name = (n as unknown as { name: string }).name;
      if (mapping[name]) return parse(mapping[name]);
    }
    return n;
  });
  return node.toString();
};

/** Word answers ("diverges", "circle", "no") are compared as strings only. */
export const isWordAnswer = (normalized: string): boolean =>
  /^[a-z]+$/.test(normalized) && !VARIABLE_WORDS.has(normalized) && !CONSTANTS.has(normalized);

/** Normalization for closed-vocabulary word answers. */
export const normalizeWord = (raw: string): string =>
  raw.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.!]+$/, '');
