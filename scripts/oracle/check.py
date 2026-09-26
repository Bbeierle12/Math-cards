#!/usr/bin/env python3
"""
Development-only CAS oracle, step 2 of 2: prove or refute the symbolic claims
exported by scripts/oracle/export.eval.ts, with SymPy.

Each claim ends as
  proved    SymPy establishes it exactly
  refuted   SymPy (or a high-precision numeric evaluation) contradicts it
  unproven  SymPy could not decide it symbolically, but it agrees numerically
            at every test point (reported, not fatal)

Exit status 1 if any claim is refuted. Not part of the app build or of
`npm test`; run with `npm run oracle` (needs python3 with sympy).

The claims are Python/SymPy expressions produced by our own exporter from our
own generators, so they are evaluated with eval() in a SymPy namespace.
"""
import json
import random
import sys
from collections import defaultdict

import sympy
from sympy import (Abs, AccumBounds, E, Rational, S, Sum, diff, integrate, limit, oo, series,
                   simplify, solve, summation, symbols, trigsimp, zoo, nan)

x, t, theta, y = symbols('x t theta y', real=True)
n = symbols('n', integer=True, positive=True)
NS = {name: getattr(sympy, name) for name in dir(sympy) if not name.startswith('_')}
NS.update({'x': x, 't': t, 'theta': theta, 'y': y, 'n': n, 'e': E, 'E': E})

TOL = 1e-12


def ev(text):
    return eval(text, dict(NS))  # noqa: S307 - our own exporter's output, dev-only


def close(a, b):
    a, b = complex(sympy.N(a, 40)), complex(sympy.N(b, 40))
    return abs(a - b) <= TOL * max(1.0, abs(b))


def zero_expr(expr, var_points):
    """'proved' if expr simplifies to 0, 'refuted' if it is numerically nonzero somewhere, else 'unproven'."""
    for simp in (simplify, trigsimp, lambda e: simplify(sympy.expand_trig(e)), lambda e: simplify(e.rewrite(sympy.exp))):
        try:
            if simp(expr) == 0:
                return 'proved'
        except Exception:  # noqa: BLE001 - try the next strategy
            pass
    free = sorted(expr.free_symbols, key=str)
    rng = random.Random(0)
    for _ in range(12):
        subs = {s: var_points(s, rng) for s in free}
        try:
            v = complex(sympy.N(expr.subs(subs), 30))
        except (TypeError, ValueError):
            continue
        if v != v or abs(v) == float('inf'):  # outside the domain at this point
            continue
        if abs(v) > 1e-9:
            return 'refuted'
    return 'unproven'


def point(s, rng):
    return Rational(rng.randint(5, 95), 100)  # (0.05, 0.95): inside every domain used here


def check(claim):
    kind = claim['type']
    if kind == 'identity':
        return zero_expr(ev(claim['a']) - ev(claim['b']), point)
    if kind == 'derivative':
        v = ev(claim['x'])
        return zero_expr(diff(ev(claim['f']), v) - ev(claim['g']), point)
    if kind == 'antiderivative':
        v = ev(claim['x'])
        # d|u|/dx = sign(u)·u'; rewrite sign(u) as u/|u| (valid wherever u ≠ 0, i.e. wherever
        # ln|u| is defined) so that ln|cos x| simplifies to tan x
        dF = diff(S(ev(claim['F'])), v).replace(sympy.sign, lambda u: u / Abs(u))
        return zero_expr(dF - ev(claim['f']), point)
    if kind == 'definite':
        v = ev(claim['x'])
        value = integrate(ev(claim['f']), (v, ev(claim['a']), ev(claim['b'])))
        if claim['value'] == 'oo':
            return 'proved' if value == oo else 'refuted'
        if value.has(sympy.Integral) or value in (oo, -oo, zoo, nan):
            return 'refuted' if value in (oo, -oo, zoo, nan) else 'unproven'
        return 'proved' if close(value, ev(claim['value'])) else 'refuted'
    if kind == 'roots':
        v = ev(claim['x'])
        real_roots = {r for r in solve(ev(claim['poly']), v) if r.is_real}
        claimed = [S(r) for r in claim['roots']]
        if any(not any(close(r, c) for r in real_roots) for c in claimed):
            return 'refuted'
        if claim['exact'] and len(real_roots) != len({str(c) for c in claimed}):
            return 'refuted'
        return 'proved'
    if kind == 'limit':
        v = ev(claim['x'])
        at = ev(claim['at'])
        try:
            value = limit(ev(claim['expr']), v, at)
        except Exception:  # noqa: BLE001 - no limit (e.g. oscillation)
            value = None
        finite = value is not None and not isinstance(value, AccumBounds) and value.is_finite
        if claim['value'] == 'none':
            return 'refuted' if finite else 'proved'
        return 'proved' if finite and close(value, ev(claim['value'])) else 'refuted'
    if kind == 'sum':
        value = summation(ev(claim['term']), (n, claim['start'], oo))
        return 'proved' if value.is_finite and close(value, ev(claim['value'])) else 'refuted'
    if kind == 'converges':
        verdict = Sum(ev(claim['term']), (n, claim['start'], oo)).is_convergent()
        return 'proved' if bool(verdict) == claim['value'] else 'refuted'
    if kind == 'radius':
        c = S(ev(claim['coef']))
        ratio = simplify(Abs(c / c.subs(n, n + 1)))
        value = limit(ratio, n, oo)
        if claim['value'] == 'oo':
            return 'proved' if value == oo else 'refuted'
        return 'proved' if value.is_finite and close(value, ev(claim['value'])) else 'refuted'
    if kind == 'maclaurin':
        v = ev(claim['x'])
        return zero_expr(series(ev(claim['f']), v, 0, claim['order']).removeO() - ev(claim['poly']), point)
    if kind == 'value':
        value = ev(claim['expr'])
        return 'proved' if close(value, ev(claim['value'])) else 'refuted'
    raise ValueError(f'unknown claim type {kind}')


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else 'scripts/oracle/out/claims.json'
    data = json.load(open(path))
    tally = defaultdict(lambda: defaultdict(int))
    problems = []
    for record in data['records']:
        for claim in record['claims']:
            try:
                verdict = check(claim)
            except Exception as exc:  # noqa: BLE001 - a crash is a refutation we must look at
                verdict = 'refuted'
                claim = {**claim, 'error': repr(exc)}
            tally[record['topic']][verdict] += 1
            if verdict != 'proved':
                problems.append((verdict, record, claim))
    width = max(len(tp) for tp in tally)
    for topic in sorted(tally):
        counts = tally[topic]
        print(f"{topic:<{width}}  proved {counts['proved']:>4}  unproven {counts['unproven']:>3}  refuted {counts['refuted']:>3}")
    for verdict, record, claim in problems[:40]:
        print(f"\n[{verdict}] {record['topic']} seed {record['seed']} ({record['templateId']})\n  {record['problemText']!r}\n  {json.dumps(claim)}")
    refuted = sum(c['refuted'] for c in tally.values())
    unproven = sum(c['unproven'] for c in tally.values())
    print(f"\n{sum(sum(c.values()) for c in tally.values())} claims: {refuted} refuted, {unproven} unproven."
          f" Templates without a symbolic claim: {len(data['uncovered'])} (covered by mathCorrectness.test.ts).")
    sys.exit(1 if refuted else 0)


if __name__ == '__main__':
    main()
