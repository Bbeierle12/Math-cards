/**
 * Fact registry: every statement shown on the seven formula sheets, with the
 * hypotheses under which it holds. The sheet components render from this data
 * (components/FactSheet.tsx) and components/formulaSheets.test.tsx asserts
 * against it.
 *
 * Conventions
 * - Every display string is a MathText string: `$...$` is inline KaTeX, the
 *   rest is plain text. Strings are written with the `tex` tag (String.raw) so
 *   LaTeX backslashes survive (`'\neq'` in a plain literal would be a newline).
 * - `statement` is the claim itself; conditions live in `hypotheses`, never
 *   inside the statement. `hypotheses` is empty only for definitions,
 *   notation/conventions, procedures, and identities that hold for every value
 *   of their symbols.
 * - `conclusion` is what a test/theorem delivers when that is separate from the
 *   statement (e.g. the three outcomes of the Ratio Test).
 * - `counterexample` shows why a hypothesis is needed.
 * - `source` is an editorial reference: OpenStax for theorem statements, DLMF
 *   for series of special functions, 'Standard' for elementary formulas.
 * - Section fields other than `title`, `facts`, `note` and `subsections` only
 *   choose the layout and carry no mathematical content.
 */

const tex = String.raw;

export interface Fact {
  /** Stable kebab-case id, unique across all sheets and prefixed with its sheet's id. */
  id: string;
  /** The item heading. */
  title: string;
  /** The formula lines. */
  statement: string[];
  /** Conditions under which the statement holds. */
  hypotheses: string[];
  /** For theorems/tests: what follows when the hypotheses hold. */
  conclusion?: string;
  /** Other small print. */
  note?: string;
  /** Editorial reference. */
  source: string;
  /** Why the hypotheses are needed. */
  counterexample?: string;
}

export interface FactSection {
  title: string;
  facts: Fact[];
  /** Small print under the section heading. */
  note?: string;
  /** Titled sub-lists drawn inside the same card, after this section's facts. */
  subsections?: FactSection[];
  /**
   * Layout only. 'grid' (default): a card in the two-column grid;
   * 'highlight': a full-width gradient panel below the grid;
   * 'wide': a full-width plain panel below the grid.
   */
  placement?: 'grid' | 'highlight' | 'wide';
  /** Layout only, for grid cards and subsections: stacked 'cards' (default) or label | formula 'rows'. */
  layout?: 'cards' | 'rows';
}

export interface FactSheet {
  /** Prefix of every fact id on the sheet. */
  id: string;
  title: string;
  subtitle: string;
  sections: FactSection[];
}

export type FactSheetKey =
  | 'preAlgebra'
  | 'algebra1'
  | 'geometry'
  | 'algebra2'
  | 'preCalculus'
  | 'calculus'
  | 'calc2';

// ---------------------------------------------------------------------------
// Shared hypothesis strings
// ---------------------------------------------------------------------------

const RADIANS = tex`$x$ in radians`;
const LOG_BASE = [tex`$b > 0$`, tex`$b \neq 1$`];
const BOTH_LIMITS = tex`$\lim_{x \to c} f(x)$ and $\lim_{x \to c} g(x)$ both exist and are finite`;
const ALL_REAL_X = tex`$x$ any real number`;

// ---------------------------------------------------------------------------
// Pre-Algebra
// ---------------------------------------------------------------------------

const PRE_ALGEBRA: FactSheet = {
  id: 'prealg',
  title: 'Pre-Algebra Formula Reference',
  subtitle: 'Essential formulas for pre-algebra topics',
  sections: [
    {
      title: 'Order of Operations (PEMDAS)',
      facts: [
        {
          id: 'prealg-pemdas-parentheses',
          title: 'P — Parentheses',
          statement: ['Evaluate expressions inside parentheses first'],
          hypotheses: [],
          source: 'OpenStax Prealgebra 2e, §2.1',
        },
        {
          id: 'prealg-pemdas-exponents',
          title: 'E — Exponents',
          statement: ['Evaluate powers and roots'],
          hypotheses: [],
          source: 'OpenStax Prealgebra 2e, §2.1',
        },
        {
          id: 'prealg-pemdas-multiply-divide',
          title: 'MD — Multiplication & Division',
          statement: ['Left to right'],
          hypotheses: [],
          source: 'OpenStax Prealgebra 2e, §2.1',
        },
        {
          id: 'prealg-pemdas-add-subtract',
          title: 'AS — Addition & Subtraction',
          statement: ['Left to right'],
          hypotheses: [],
          source: 'OpenStax Prealgebra 2e, §2.1',
        },
      ],
    },
    {
      title: 'Fraction Rules',
      layout: 'rows',
      facts: [
        {
          id: 'prealg-fraction-add-same-denominator',
          title: 'Adding (same denom.)',
          statement: [tex`$\frac{a}{c} + \frac{b}{c} = \frac{a+b}{c}$`],
          hypotheses: [tex`$c \neq 0$`],
          source: 'OpenStax Prealgebra 2e, §4.4',
        },
        {
          id: 'prealg-fraction-add-different-denominators',
          title: 'Adding (diff. denom.)',
          statement: [tex`$\frac{a}{b} + \frac{c}{d} = \frac{ad+bc}{bd}$`],
          hypotheses: [tex`$b, d \neq 0$`],
          source: 'OpenStax Prealgebra 2e, §4.5',
        },
        {
          id: 'prealg-fraction-multiply',
          title: 'Multiplying',
          statement: [tex`$\frac{a}{b} \times \frac{c}{d} = \frac{ac}{bd}$`],
          hypotheses: [tex`$b, d \neq 0$`],
          source: 'OpenStax Prealgebra 2e, §4.2',
        },
        {
          id: 'prealg-fraction-divide',
          title: 'Dividing',
          statement: [tex`$\frac{a}{b} \div \frac{c}{d} = \frac{a}{b} \times \frac{d}{c}$`],
          hypotheses: [tex`$b, c, d \neq 0$`],
          source: 'OpenStax Prealgebra 2e, §4.2',
        },
        {
          id: 'prealg-fraction-cross-multiply',
          title: 'Cross multiply',
          statement: [tex`$\frac{a}{b} = \frac{c}{d} \iff ad = bc$`],
          hypotheses: [tex`$b, d \neq 0$`],
          source: 'OpenStax Prealgebra 2e, §6.5',
        },
      ],
    },
    {
      title: 'Decimals & Percents',
      layout: 'rows',
      facts: [
        {
          id: 'prealg-decimal-to-percent',
          title: 'Decimal to percent',
          statement: ['Multiply by 100'],
          hypotheses: [],
          source: 'OpenStax Prealgebra 2e, §6.1',
        },
        {
          id: 'prealg-percent-to-decimal',
          title: 'Percent to decimal',
          statement: ['Divide by 100'],
          hypotheses: [],
          source: 'OpenStax Prealgebra 2e, §6.1',
        },
        {
          id: 'prealg-fraction-to-decimal',
          title: 'Fraction to decimal',
          statement: ['Divide numerator by denominator'],
          hypotheses: [],
          source: 'OpenStax Prealgebra 2e, §5.3',
        },
        {
          id: 'prealg-percent-of-number',
          title: 'Percent of a number',
          statement: [tex`$\frac{p}{100} \times n$`],
          hypotheses: [],
          source: 'OpenStax Prealgebra 2e, §6.2',
        },
      ],
    },
    {
      title: 'Integer Rules',
      layout: 'rows',
      facts: [
        {
          id: 'prealg-integer-positive-times-positive',
          title: 'Positive × positive',
          statement: [tex`$(+) \times (+) = +$`],
          hypotheses: [],
          source: 'OpenStax Prealgebra 2e, §3.4',
        },
        {
          id: 'prealg-integer-negative-times-negative',
          title: 'Negative × negative',
          statement: [tex`$(-) \times (-) = +$`],
          hypotheses: [],
          source: 'OpenStax Prealgebra 2e, §3.4',
        },
        {
          id: 'prealg-integer-positive-times-negative',
          title: 'Positive × negative',
          statement: [tex`$(+) \times (-) = -$`],
          hypotheses: [],
          source: 'OpenStax Prealgebra 2e, §3.4',
        },
        {
          id: 'prealg-integer-division',
          title: 'Division',
          statement: ['Same rules apply for division'],
          hypotheses: [tex`divisor $\neq 0$`],
          source: 'OpenStax Prealgebra 2e, §3.4',
        },
        {
          id: 'prealg-subtract-negative',
          title: 'Subtracting a negative',
          statement: [tex`$a - (-b) = a + b$`],
          hypotheses: [],
          source: 'OpenStax Prealgebra 2e, §3.3',
        },
      ],
    },
    {
      title: 'Number Properties',
      placement: 'highlight',
      facts: [
        {
          id: 'prealg-commutative',
          title: 'Commutative',
          statement: [tex`$a + b = b + a$`, tex`$a \times b = b \times a$`],
          hypotheses: [],
          source: 'OpenStax Prealgebra 2e, §7.2',
        },
        {
          id: 'prealg-associative',
          title: 'Associative',
          statement: [tex`$(a + b) + c = a + (b + c)$`, tex`$(a \times b) \times c = a \times (b \times c)$`],
          hypotheses: [],
          source: 'OpenStax Prealgebra 2e, §7.2',
        },
        {
          id: 'prealg-distributive',
          title: 'Distributive',
          statement: [tex`$a(b + c) = ab + ac$`],
          hypotheses: [],
          source: 'OpenStax Prealgebra 2e, §7.3',
        },
        {
          id: 'prealg-identity',
          title: 'Identity',
          statement: [tex`$a + 0 = a$, $a \times 1 = a$`],
          hypotheses: [],
          source: 'OpenStax Prealgebra 2e, §7.4',
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Algebra 1
// ---------------------------------------------------------------------------

const ALGEBRA_1: FactSheet = {
  id: 'alg1',
  title: 'Algebra 1 Formula Reference',
  subtitle: 'Key formulas for equations, inequalities, and polynomials',
  sections: [
    {
      title: 'Linear Equations',
      facts: [
        {
          id: 'alg1-slope-intercept-form',
          title: 'Slope-Intercept Form',
          statement: [tex`$y = mx + b$`],
          hypotheses: [],
          source: 'OpenStax Elementary Algebra 2e, §4.5',
        },
        {
          id: 'alg1-point-slope-form',
          title: 'Point-Slope Form',
          statement: [tex`$y - y_1 = m(x - x_1)$`],
          hypotheses: [],
          source: 'OpenStax Elementary Algebra 2e, §4.6',
        },
        {
          id: 'alg1-line-standard-form',
          title: 'Standard Form',
          statement: [tex`$Ax + By = C$`],
          hypotheses: [tex`$A$ and $B$ not both $0$`],
          source: 'OpenStax Elementary Algebra 2e, §4.6',
        },
        {
          id: 'alg1-slope-formula',
          title: 'Slope Formula',
          statement: [tex`$m = \frac{y_2 - y_1}{x_2 - x_1}$`],
          hypotheses: [tex`$x_2 \neq x_1$`],
          counterexample: tex`A vertical line has no slope: for $(2, 1)$ and $(2, 5)$ the formula would give $\frac{4}{0}$.`,
          source: 'OpenStax Elementary Algebra 2e, §4.4',
        },
      ],
    },
    {
      title: 'Exponent Rules',
      layout: 'rows',
      note: tex`Stated for integer exponents; with non-integer exponents the rules hold when $a, b > 0$.`,
      facts: [
        {
          id: 'alg1-exponent-product',
          title: 'Product Rule',
          statement: [tex`$a^m \cdot a^n = a^{m+n}$`],
          hypotheses: [tex`$m, n$ integers`, tex`$a \neq 0$ if $m \leq 0$ or $n \leq 0$`],
          source: 'OpenStax Elementary Algebra 2e, §6.2, §6.7',
        },
        {
          id: 'alg1-exponent-quotient',
          title: 'Quotient Rule',
          statement: [tex`$\frac{a^m}{a^n} = a^{m-n}$`],
          hypotheses: [tex`$a \neq 0$`, tex`$m, n$ integers`],
          source: 'OpenStax Elementary Algebra 2e, §6.5, §6.7',
        },
        {
          id: 'alg1-exponent-power',
          title: 'Power Rule',
          statement: [tex`$(a^m)^n = a^{mn}$`],
          hypotheses: [tex`$m, n$ integers`, tex`$a \neq 0$ if $m \leq 0$ or $n \leq 0$`],
          counterexample: tex`With a non-integer exponent and $a < 0$ it fails: $\left((-1)^2\right)^{1/2} = 1$ but $(-1)^{2 \cdot \frac{1}{2}} = -1$.`,
          source: 'OpenStax Elementary Algebra 2e, §6.2',
        },
        {
          id: 'alg1-exponent-zero',
          title: 'Zero Exponent',
          statement: [tex`$a^0 = 1$`],
          hypotheses: [tex`$a \neq 0$`],
          source: 'OpenStax Elementary Algebra 2e, §6.5',
        },
        {
          id: 'alg1-exponent-negative',
          title: 'Negative Exponent',
          statement: [tex`$a^{-n} = \frac{1}{a^n}$`],
          hypotheses: [tex`$a \neq 0$`, tex`$n$ an integer`],
          source: 'OpenStax Elementary Algebra 2e, §6.7',
        },
        {
          id: 'alg1-exponent-product-to-power',
          title: 'Product to Power',
          statement: [tex`$(ab)^n = a^n b^n$`],
          hypotheses: [tex`$n$ an integer`, tex`$a, b \neq 0$ if $n \leq 0$`],
          source: 'OpenStax Elementary Algebra 2e, §6.2',
        },
      ],
    },
    {
      title: 'Factoring Patterns',
      facts: [
        {
          id: 'alg1-factor-gcf',
          title: 'Greatest Common Factor',
          statement: [tex`$ab + ac = a(b + c)$`],
          hypotheses: [],
          source: 'OpenStax Elementary Algebra 2e, §7.1',
        },
        {
          id: 'alg1-factor-difference-of-squares',
          title: 'Difference of Squares',
          statement: [tex`$a^2 - b^2 = (a+b)(a-b)$`],
          hypotheses: [],
          source: 'OpenStax Elementary Algebra 2e, §7.4',
        },
        {
          id: 'alg1-factor-perfect-square',
          title: 'Perfect Square Trinomial',
          statement: [tex`$a^2 + 2ab + b^2 = (a+b)^2$`, tex`$a^2 - 2ab + b^2 = (a-b)^2$`],
          hypotheses: [],
          source: 'OpenStax Elementary Algebra 2e, §7.4',
        },
        {
          id: 'alg1-factor-trinomial',
          title: 'Trinomial',
          statement: [tex`$x^2 + bx + c = (x+p)(x+q)$`],
          hypotheses: [tex`$p + q = b$`, tex`$pq = c$`],
          source: 'OpenStax Elementary Algebra 2e, §7.2',
        },
      ],
    },
    {
      title: 'Quadratic Equations',
      facts: [
        {
          id: 'alg1-quadratic-standard-form',
          title: 'Standard Form',
          statement: [tex`$ax^2 + bx + c = 0$`],
          hypotheses: [tex`$a \neq 0$`],
          source: 'OpenStax Elementary Algebra 2e, §7.6',
        },
        {
          id: 'alg1-quadratic-formula',
          title: 'Quadratic Formula',
          statement: [tex`$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$`],
          hypotheses: [tex`$ax^2 + bx + c = 0$ with $a \neq 0$`],
          source: 'OpenStax Elementary Algebra 2e, §10.3',
        },
        {
          id: 'alg1-discriminant',
          title: 'Discriminant',
          statement: [tex`$\Delta = b^2 - 4ac$`],
          hypotheses: [tex`$a, b, c$ real, $a \neq 0$`],
          conclusion: tex`$\Delta > 0$: 2 real solutions | $\Delta = 0$: 1 solution | $\Delta < 0$: no real solutions`,
          source: 'OpenStax Elementary Algebra 2e, §10.3',
        },
        {
          id: 'alg1-vertex-form',
          title: 'Vertex Form',
          statement: [tex`$y = a(x-h)^2 + k$, vertex at $(h, k)$`],
          hypotheses: [tex`$a \neq 0$`],
          source: 'OpenStax College Algebra 2e, §5.1',
        },
      ],
    },
    {
      title: 'Inequality Rules',
      placement: 'highlight',
      facts: [
        {
          id: 'alg1-inequality-add-subtract',
          title: 'Adding/Subtracting',
          statement: ['Direction of inequality stays the same'],
          hypotheses: [],
          source: 'OpenStax Elementary Algebra 2e, §2.7',
        },
        {
          id: 'alg1-inequality-multiply-positive',
          title: 'Multiplying/Dividing by Positive',
          statement: ['Direction of inequality stays the same'],
          hypotheses: [tex`the multiplier or divisor $c > 0$`],
          source: 'OpenStax Elementary Algebra 2e, §2.7',
        },
        {
          id: 'alg1-inequality-multiply-negative',
          title: 'Multiplying/Dividing by Negative',
          statement: ['Flip the inequality sign!'],
          hypotheses: [tex`the multiplier or divisor $c < 0$`],
          counterexample: tex`$2 < 3$, but multiplying both sides by $-1$ gives $-2 > -3$.`,
          source: 'OpenStax Elementary Algebra 2e, §2.7',
        },
        {
          id: 'alg1-compound-inequality',
          title: 'Compound Inequalities',
          statement: [tex`$a < x < b$ means $x > a$ AND $x < b$`],
          hypotheses: [],
          source: 'OpenStax College Algebra 2e, §2.7',
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

const GEOMETRY: FactSheet = {
  id: 'geo',
  title: 'Geometry Formula Reference',
  subtitle: 'Shapes, areas, volumes, and key theorems',
  sections: [
    {
      title: '2D Area Formulas',
      layout: 'rows',
      facts: [
        { id: 'geo-area-rectangle', title: 'Rectangle', statement: [tex`$A = lw$`], hypotheses: [], source: 'OpenStax Prealgebra 2e, §9.4' },
        { id: 'geo-area-triangle', title: 'Triangle', statement: [tex`$A = \frac{1}{2}bh$`], hypotheses: [], source: 'OpenStax Prealgebra 2e, §9.4' },
        { id: 'geo-area-parallelogram', title: 'Parallelogram', statement: [tex`$A = bh$`], hypotheses: [], source: 'Standard' },
        { id: 'geo-area-trapezoid', title: 'Trapezoid', statement: [tex`$A = \frac{1}{2}(b_1 + b_2)h$`], hypotheses: [], source: 'OpenStax Prealgebra 2e, §9.4' },
        { id: 'geo-area-circle', title: 'Circle', statement: [tex`$A = \pi r^2$`], hypotheses: [], source: 'OpenStax Prealgebra 2e, §9.5' },
        {
          id: 'geo-area-regular-polygon',
          title: 'Regular polygon',
          statement: [tex`$A = \frac{1}{2}ap$`],
          hypotheses: [],
          note: tex`$a$ = apothem, $p$ = perimeter`,
          source: 'Standard',
        },
      ],
    },
    {
      title: 'Perimeter & Circumference',
      layout: 'rows',
      facts: [
        { id: 'geo-perimeter-rectangle', title: 'Rectangle', statement: [tex`$P = 2l + 2w$`], hypotheses: [], source: 'OpenStax Prealgebra 2e, §9.4' },
        { id: 'geo-perimeter-triangle', title: 'Triangle', statement: [tex`$P = a + b + c$`], hypotheses: [], source: 'OpenStax Prealgebra 2e, §9.4' },
        { id: 'geo-circumference', title: 'Circumference', statement: [tex`$C = 2\pi r = \pi d$`], hypotheses: [], source: 'OpenStax Prealgebra 2e, §9.5' },
        {
          id: 'geo-arc-length',
          title: 'Arc length',
          statement: [tex`$s = r\theta$`],
          hypotheses: [tex`$\theta$ in radians`],
          source: 'OpenStax Precalculus 2e, §5.1',
        },
        {
          id: 'geo-sector-area',
          title: 'Sector area',
          statement: [tex`$A = \frac{1}{2}r^2\theta$`],
          hypotheses: [tex`$\theta$ in radians`],
          source: 'OpenStax Precalculus 2e, §5.1',
        },
      ],
    },
    {
      title: 'Volume Formulas',
      layout: 'rows',
      facts: [
        { id: 'geo-volume-rectangular-prism', title: 'Rectangular prism', statement: [tex`$V = lwh$`], hypotheses: [], source: 'OpenStax Prealgebra 2e, §9.6' },
        { id: 'geo-volume-cylinder', title: 'Cylinder', statement: [tex`$V = \pi r^2 h$`], hypotheses: [], source: 'OpenStax Prealgebra 2e, §9.6' },
        { id: 'geo-volume-cone', title: 'Cone', statement: [tex`$V = \frac{1}{3}\pi r^2 h$`], hypotheses: [], source: 'OpenStax Prealgebra 2e, §9.6' },
        { id: 'geo-volume-sphere', title: 'Sphere', statement: [tex`$V = \frac{4}{3}\pi r^3$`], hypotheses: [], source: 'OpenStax Prealgebra 2e, §9.6' },
        {
          id: 'geo-volume-pyramid',
          title: 'Pyramid',
          statement: [tex`$V = \frac{1}{3}Bh$`],
          hypotheses: [],
          note: tex`$B$ = area of the base`,
          source: 'Standard',
        },
      ],
    },
    {
      title: 'Surface Area',
      layout: 'rows',
      facts: [
        { id: 'geo-surface-rectangular-prism', title: 'Rectangular prism', statement: [tex`$SA = 2(lw + lh + wh)$`], hypotheses: [], source: 'OpenStax Prealgebra 2e, §9.6' },
        { id: 'geo-surface-cylinder', title: 'Cylinder', statement: [tex`$SA = 2\pi r^2 + 2\pi rh$`], hypotheses: [], source: 'OpenStax Prealgebra 2e, §9.6' },
        {
          id: 'geo-surface-cone',
          title: 'Cone',
          statement: [tex`$SA = \pi r^2 + \pi r l$`],
          hypotheses: [],
          note: tex`$l$ = slant height`,
          source: 'Standard',
        },
        { id: 'geo-surface-sphere', title: 'Sphere', statement: [tex`$SA = 4\pi r^2$`], hypotheses: [], source: 'OpenStax Prealgebra 2e, §9.6' },
      ],
    },
    {
      title: 'Key Theorems',
      placement: 'highlight',
      facts: [
        {
          id: 'geo-pythagorean-theorem',
          title: 'Pythagorean Theorem',
          statement: [tex`$a^2 + b^2 = c^2$`],
          hypotheses: [tex`a right triangle with legs $a$, $b$ and hypotenuse $c$`],
          source: 'OpenStax Prealgebra 2e, §9.3',
        },
        {
          id: 'geo-distance-formula',
          title: 'Distance Formula',
          statement: [tex`$d = \sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}$`],
          hypotheses: [],
          source: 'OpenStax College Algebra 2e, §2.1',
        },
        {
          id: 'geo-midpoint-formula',
          title: 'Midpoint Formula',
          statement: [tex`$M = \left(\frac{x_1+x_2}{2}, \frac{y_1+y_2}{2}\right)$`],
          hypotheses: [],
          source: 'OpenStax College Algebra 2e, §2.1',
        },
        {
          id: 'geo-triangle-angle-sum',
          title: 'Triangle Angle Sum',
          statement: [tex`Interior angles sum to $180°$`],
          hypotheses: ['a triangle in the plane (Euclidean geometry)'],
          source: 'OpenStax Prealgebra 2e, §9.3',
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Algebra 2
// ---------------------------------------------------------------------------

const ALGEBRA_2: FactSheet = {
  id: 'alg2',
  title: 'Algebra 2 Formula Reference',
  subtitle: 'Complex numbers, radicals, logarithms, and series',
  sections: [
    {
      title: 'Complex Numbers',
      layout: 'rows',
      facts: [
        {
          id: 'alg2-imaginary-unit',
          title: 'Definition',
          statement: [tex`$i = \sqrt{-1}$, $i^2 = -1$`],
          hypotheses: [],
          source: 'OpenStax College Algebra 2e, §2.4',
        },
        {
          id: 'alg2-complex-standard-form',
          title: 'Standard form',
          statement: [tex`$a + bi$`],
          hypotheses: [tex`$a, b$ real`],
          source: 'OpenStax College Algebra 2e, §2.4',
        },
        {
          id: 'alg2-complex-conjugate',
          title: 'Conjugate',
          statement: [tex`$\overline{a + bi} = a - bi$`],
          hypotheses: [tex`$a, b$ real`],
          source: 'OpenStax College Algebra 2e, §2.4',
        },
        {
          id: 'alg2-complex-modulus',
          title: 'Modulus',
          statement: [tex`$|a + bi| = \sqrt{a^2 + b^2}$`],
          hypotheses: [tex`$a, b$ real`],
          source: 'OpenStax Precalculus 2e, §8.5',
        },
        {
          id: 'alg2-complex-conjugate-product',
          title: 'Multiply conjugates',
          statement: [tex`$(a+bi)(a-bi) = a^2 + b^2$`],
          hypotheses: [tex`$a, b$ real`],
          source: 'OpenStax College Algebra 2e, §2.4',
        },
      ],
    },
    {
      title: 'Radical Rules',
      layout: 'rows',
      note: 'These are rules for real square roots: they need non-negative radicands.',
      facts: [
        {
          id: 'alg2-radical-product',
          title: 'Product',
          statement: [tex`$\sqrt{ab} = \sqrt{a}\cdot\sqrt{b}$`],
          hypotheses: [tex`$a, b \geq 0$`],
          counterexample: tex`$\sqrt{(-1)(-1)} = 1$ but $\sqrt{-1}\cdot\sqrt{-1} = i^2 = -1$: the rule fails for negatives even though $i = \sqrt{-1}$ exists.`,
          source: 'OpenStax College Algebra 2e, §1.3',
        },
        {
          id: 'alg2-radical-quotient',
          title: 'Quotient',
          statement: [tex`$\sqrt{\frac{a}{b}} = \frac{\sqrt{a}}{\sqrt{b}}$`],
          hypotheses: [tex`$a \geq 0$`, tex`$b > 0$`],
          source: 'OpenStax College Algebra 2e, §1.3',
        },
        {
          id: 'alg2-rational-exponent',
          title: 'Rational exponent',
          statement: [tex`$a^{m/n} = \sqrt[n]{a^m} = (\sqrt[n]{a})^m$`],
          hypotheses: [tex`$a > 0$`, tex`$m, n$ integers, $n > 0$`],
          source: 'OpenStax College Algebra 2e, §1.3',
        },
        {
          id: 'alg2-rationalizing',
          title: 'Rationalizing',
          statement: [tex`$\frac{1}{\sqrt{a}} = \frac{\sqrt{a}}{a}$`],
          hypotheses: [tex`$a > 0$`],
          source: 'OpenStax College Algebra 2e, §1.3',
        },
        {
          id: 'alg2-square-root-of-square',
          title: 'Square of a root',
          statement: [tex`$\sqrt{a^2} = |a|$`],
          hypotheses: [tex`$a$ real`],
          source: 'OpenStax College Algebra 2e, §1.3',
        },
      ],
    },
    {
      title: 'Logarithm Rules',
      note: 'Logarithms of zero or negative numbers are undefined in the reals.',
      facts: [
        {
          id: 'alg2-log-definition',
          title: 'Definition',
          statement: [tex`$\log_b x = y \iff b^y = x$`],
          hypotheses: [...LOG_BASE, tex`$x > 0$`],
          source: 'OpenStax College Algebra 2e, §6.3',
        },
        {
          id: 'alg2-log-product',
          title: 'Product Rule',
          statement: [tex`$\log_b(xy) = \log_b x + \log_b y$`],
          hypotheses: [...LOG_BASE, tex`$x, y > 0$`],
          counterexample: tex`$\log_{10}\left((-2)(-5)\right) = 1$, but $\log_{10}(-2)$ and $\log_{10}(-5)$ are undefined.`,
          source: 'OpenStax College Algebra 2e, §6.5',
        },
        {
          id: 'alg2-log-quotient',
          title: 'Quotient Rule',
          statement: [tex`$\log_b\left(\frac{x}{y}\right) = \log_b x - \log_b y$`],
          hypotheses: [...LOG_BASE, tex`$x, y > 0$`],
          source: 'OpenStax College Algebra 2e, §6.5',
        },
        {
          id: 'alg2-log-power',
          title: 'Power Rule',
          statement: [tex`$\log_b(x^n) = n\log_b x$`],
          hypotheses: [...LOG_BASE, tex`$x > 0$`],
          note: tex`For even $n$ and $x < 0$ use $n\log_b|x|$.`,
          counterexample: tex`$\log_{10}\left((-10)^2\right) = 2$, but $2\log_{10}(-10)$ is undefined.`,
          source: 'OpenStax College Algebra 2e, §6.5',
        },
        {
          id: 'alg2-log-change-of-base',
          title: 'Change of Base',
          statement: [tex`$\log_b x = \frac{\ln x}{\ln b}$`],
          hypotheses: [...LOG_BASE, tex`$x > 0$`],
          source: 'OpenStax College Algebra 2e, §6.5',
        },
      ],
    },
    {
      title: 'Sequences & Series',
      facts: [
        {
          id: 'alg2-arithmetic-sequence',
          title: 'Arithmetic Sequence',
          statement: [tex`$a_n = a_1 + (n-1)d$`],
          hypotheses: [],
          source: 'OpenStax College Algebra 2e, §9.2',
        },
        {
          id: 'alg2-arithmetic-sum',
          title: 'Arithmetic Sum',
          statement: [tex`$S_n = \frac{n}{2}(a_1 + a_n)$`],
          hypotheses: [],
          source: 'OpenStax College Algebra 2e, §9.4',
        },
        {
          id: 'alg2-geometric-sequence',
          title: 'Geometric Sequence',
          statement: [tex`$a_n = a_1 \cdot r^{n-1}$`],
          hypotheses: [],
          source: 'OpenStax College Algebra 2e, §9.3',
        },
        {
          id: 'alg2-geometric-sum-finite',
          title: 'Geometric Sum (finite)',
          statement: [tex`$S_n = a_1 \cdot \frac{1 - r^n}{1 - r}$`],
          hypotheses: [tex`$r \neq 1$`],
          note: tex`If $r = 1$, $S_n = n a_1$.`,
          source: 'OpenStax College Algebra 2e, §9.4',
        },
        {
          id: 'alg2-geometric-sum-infinite',
          title: 'Geometric Sum (infinite)',
          statement: [tex`$S = \frac{a_1}{1 - r}$`],
          hypotheses: [tex`$|r| < 1$`],
          note: tex`Diverges when $|r| \geq 1$ (unless $a_1 = 0$).`,
          source: 'OpenStax College Algebra 2e, §9.4',
        },
      ],
    },
    {
      title: 'Rational Expressions',
      placement: 'highlight',
      facts: [
        {
          id: 'alg2-rational-multiply',
          title: 'Multiplying',
          statement: [tex`$\frac{a}{b} \cdot \frac{c}{d} = \frac{ac}{bd}$`],
          hypotheses: [tex`$b, d \neq 0$`],
          source: 'OpenStax College Algebra 2e, §1.6',
        },
        {
          id: 'alg2-rational-divide',
          title: 'Dividing',
          statement: [tex`$\frac{a}{b} \div \frac{c}{d} = \frac{a}{b} \cdot \frac{d}{c}$`],
          hypotheses: [tex`$b, c, d \neq 0$`],
          source: 'OpenStax College Algebra 2e, §1.6',
        },
        {
          id: 'alg2-rational-add',
          title: 'Adding (LCD)',
          statement: ['Find LCD, rewrite each fraction, then add numerators'],
          hypotheses: [],
          source: 'OpenStax College Algebra 2e, §1.6',
        },
        {
          id: 'alg2-rational-domain',
          title: 'Domain Restriction',
          statement: ['Denominator cannot equal zero'],
          hypotheses: [],
          source: 'OpenStax College Algebra 2e, §1.6',
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Pre-Calculus
// ---------------------------------------------------------------------------

const PRE_CALCULUS: FactSheet = {
  id: 'precalc',
  title: 'Pre-Calculus Formula Reference',
  subtitle: 'Functions, transformations, and conic sections',
  sections: [
    {
      title: 'Function Transformations',
      layout: 'rows',
      facts: [
        { id: 'precalc-shift-up', title: 'Vertical shift up', statement: [tex`$f(x) + k$`], hypotheses: [tex`$k > 0$`], source: 'OpenStax Precalculus 2e, §1.5' },
        { id: 'precalc-shift-down', title: 'Vertical shift down', statement: [tex`$f(x) - k$`], hypotheses: [tex`$k > 0$`], source: 'OpenStax Precalculus 2e, §1.5' },
        { id: 'precalc-shift-left', title: 'Horizontal shift left', statement: [tex`$f(x + h)$`], hypotheses: [tex`$h > 0$`], source: 'OpenStax Precalculus 2e, §1.5' },
        { id: 'precalc-shift-right', title: 'Horizontal shift right', statement: [tex`$f(x - h)$`], hypotheses: [tex`$h > 0$`], source: 'OpenStax Precalculus 2e, §1.5' },
        { id: 'precalc-vertical-stretch', title: 'Vertical stretch', statement: [tex`$af(x)$`], hypotheses: [tex`$a > 1$`], source: 'OpenStax Precalculus 2e, §1.5' },
        { id: 'precalc-reflect-x-axis', title: 'Reflect over x-axis', statement: [tex`$-f(x)$`], hypotheses: [], source: 'OpenStax Precalculus 2e, §1.5' },
        { id: 'precalc-reflect-y-axis', title: 'Reflect over y-axis', statement: [tex`$f(-x)$`], hypotheses: [], source: 'OpenStax Precalculus 2e, §1.5' },
      ],
    },
    {
      title: 'Polynomial Functions',
      facts: [
        {
          id: 'precalc-end-behavior',
          title: 'End Behavior',
          statement: ['Even degree, positive lead: both ends up', 'Odd degree, positive lead: left down, right up'],
          hypotheses: [tex`degree $\geq 1$`],
          source: 'OpenStax Precalculus 2e, §3.3',
        },
        {
          id: 'precalc-rational-root-theorem',
          title: 'Rational Root Theorem',
          statement: [tex`Every rational root in lowest terms $\pm\frac{p}{q}$ has $p$ | constant term and $q$ | leading coefficient.`],
          hypotheses: ['the polynomial has integer coefficients'],
          source: 'OpenStax Precalculus 2e, §3.6',
        },
        {
          id: 'precalc-remainder-theorem',
          title: 'Remainder Theorem',
          statement: [tex`When $f(x)$ is divided by $(x - c)$, remainder = $f(c)$`],
          hypotheses: [tex`$f$ is a polynomial`],
          source: 'OpenStax Precalculus 2e, §3.6',
        },
        {
          id: 'precalc-fundamental-theorem-of-algebra',
          title: 'Fundamental Theorem of Algebra',
          statement: [tex`Degree $n$ polynomial has exactly $n$ roots`],
          hypotheses: [tex`$n \geq 1$`, tex`roots counted with multiplicity, over $\mathbb{C}$`],
          source: 'OpenStax Precalculus 2e, §3.6',
        },
      ],
    },
    {
      title: 'Rational Functions',
      facts: [
        {
          id: 'precalc-vertical-asymptotes',
          title: 'Vertical Asymptotes',
          statement: ['Real zeros of the denominator of the fully reduced fraction (after cancelling common factors)'],
          hypotheses: [tex`$f = \frac{P}{Q}$ with polynomials $P$ and $Q$`],
          source: 'OpenStax Precalculus 2e, §3.7',
        },
        {
          id: 'precalc-horizontal-asymptotes',
          title: 'Horizontal Asymptotes',
          statement: [
            tex`deg(num) < deg(den): $y = 0$`,
            tex`deg(num) = deg(den): $y = \frac{a_n}{b_n}$ (ratio of the leading coefficients)`,
            tex`deg(num) = deg(den) + 1: no HA; a slant (oblique) linear asymptote $y = mx + b$, the quotient from polynomial division`,
            'deg(num) ≥ deg(den) + 2: no HA and no slant line; the graph follows the polynomial quotient (a curved asymptote)',
          ],
          hypotheses: [tex`$f = \frac{P}{Q}$ with polynomials $P$, $Q$ whose leading coefficients are $a_n$, $b_n$`],
          source: 'OpenStax Precalculus 2e, §3.7',
        },
        {
          id: 'precalc-holes',
          title: 'Holes',
          statement: [tex`A factor $(x - c)$ that cancels completely out of the denominator gives a hole at $x = c$.`],
          hypotheses: [tex`$(x - c)$ is a common factor of the numerator and denominator`],
          counterexample: tex`If $(x - c)$ still divides the reduced denominator, $x = c$ is a vertical asymptote, not a hole: $\frac{x-1}{(x-1)^2} = \frac{1}{x-1}$ has a VA at $x = 1$.`,
          source: 'OpenStax Precalculus 2e, §3.7',
        },
      ],
    },
    {
      title: 'Exponential Functions',
      facts: [
        {
          id: 'precalc-exponential-growth-decay',
          title: 'Growth/Decay',
          statement: [tex`$f(x) = a \cdot b^x$`],
          hypotheses: [tex`$a > 0$`, tex`$b > 0$, $b \neq 1$`],
          conclusion: tex`$b > 1$: growth | $0 < b < 1$: decay`,
          source: 'OpenStax Precalculus 2e, §4.1',
        },
        {
          id: 'precalc-continuous-growth',
          title: 'Continuous Growth',
          statement: [tex`$A = Pe^{rt}$`],
          hypotheses: [],
          source: 'OpenStax Precalculus 2e, §4.1',
        },
        {
          id: 'precalc-compound-interest',
          title: 'Compound Interest',
          statement: [tex`$A = P\left(1 + \frac{r}{n}\right)^{nt}$`],
          hypotheses: [],
          source: 'OpenStax Precalculus 2e, §4.1',
        },
        {
          id: 'precalc-ln-inverse',
          title: 'Natural Log Inverse',
          statement: [tex`$e^{\ln x} = x$`, tex`$\ln(e^x) = x$`],
          hypotheses: [tex`$x > 0$ for $e^{\ln x} = x$`, tex`$\ln(e^x) = x$ holds for all real $x$`],
          source: 'OpenStax Precalculus 2e, §4.5',
        },
      ],
    },
    {
      title: 'Conic Sections',
      placement: 'highlight',
      facts: [
        {
          id: 'precalc-circle',
          title: 'Circle',
          statement: [tex`$(x-h)^2 + (y-k)^2 = r^2$`],
          hypotheses: [tex`$r > 0$`],
          note: tex`Center $(h,k)$, radius $r$`,
          source: 'Standard',
        },
        {
          id: 'precalc-ellipse',
          title: 'Ellipse',
          statement: [tex`$\frac{(x-h)^2}{a^2} + \frac{(y-k)^2}{b^2} = 1$`],
          hypotheses: [tex`$a \geq b > 0$`],
          note: tex`Horizontal major axis of length $2a$; foci at $(h \pm c, k)$ with $c^2 = a^2 - b^2$. If the larger denominator is under $(y-k)^2$, the major axis is vertical and the foci are $(h, k \pm c)$.`,
          source: 'OpenStax Precalculus 2e, §10.1',
        },
        {
          id: 'precalc-hyperbola',
          title: 'Hyperbola',
          statement: [tex`$\frac{(x-h)^2}{a^2} - \frac{(y-k)^2}{b^2} = 1$ (opens left/right)`],
          hypotheses: [tex`$a, b > 0$`],
          note: tex`Foci $(h \pm c, k)$ with $c^2 = a^2 + b^2$; asymptotes $y - k = \pm\frac{b}{a}(x - h)$. For $\frac{(y-k)^2}{a^2} - \frac{(x-h)^2}{b^2} = 1$ it opens up/down with asymptotes $y - k = \pm\frac{a}{b}(x - h)$.`,
          source: 'OpenStax Precalculus 2e, §10.2',
        },
        {
          id: 'precalc-parabola',
          title: 'Parabola',
          statement: [
            tex`$(x-h)^2 = 4p(y-k)$ (vertical axis): focus $(h, k+p)$, directrix $y = k - p$`,
            tex`$(y-k)^2 = 4p(x-h)$ (horizontal axis): focus $(h+p, k)$, directrix $x = h - p$`,
          ],
          hypotheses: [tex`$p \neq 0$`],
          note: tex`Vertex $(h,k)$; the focus is $|p|$ from the vertex and the sign of $p$ gives the opening direction ($p > 0$: up / right)`,
          source: 'OpenStax Precalculus 2e, §10.3',
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Calculus
// ---------------------------------------------------------------------------

const CALCULUS: FactSheet = {
  id: 'calc',
  title: 'Calculus Formula Reference',
  subtitle: 'Essential formulas for derivatives and integrals',
  sections: [
    {
      title: '📊 Derivative Rules',
      facts: [
        {
          id: 'calc-power-rule',
          title: 'Power Rule',
          statement: [tex`$\frac{d}{dx}[x^n] = nx^{n-1}$`],
          hypotheses: [tex`$n$ an integer ($x \neq 0$ if $n \leq 0$), or $n$ real and $x > 0$`],
          source: 'OpenStax Calculus Vol. 1, §3.3, §3.9',
        },
        {
          id: 'calc-constant-multiple-rule',
          title: 'Constant Multiple Rule',
          statement: [tex`$\frac{d}{dx}[cf(x)] = c \cdot f'(x)$`],
          hypotheses: [tex`$f$ differentiable at $x$`, tex`$c$ a constant`],
          source: 'OpenStax Calculus Vol. 1, §3.3',
        },
        {
          id: 'calc-sum-rule',
          title: 'Sum/Difference Rule',
          statement: [tex`$\frac{d}{dx}[f(x) \pm g(x)] = f'(x) \pm g'(x)$`],
          hypotheses: [tex`$f$ and $g$ differentiable at $x$`],
          source: 'OpenStax Calculus Vol. 1, §3.3',
        },
        {
          id: 'calc-product-rule',
          title: 'Product Rule',
          statement: [tex`$\frac{d}{dx}[f(x)g(x)] = f'(x)g(x) + f(x)g'(x)$`],
          hypotheses: [tex`$f$ and $g$ differentiable at $x$`],
          source: 'OpenStax Calculus Vol. 1, §3.3',
        },
        {
          id: 'calc-quotient-rule',
          title: 'Quotient Rule',
          statement: [tex`$\frac{d}{dx}\left[\frac{f(x)}{g(x)}\right] = \frac{f'(x)g(x) - f(x)g'(x)}{[g(x)]^2}$`],
          hypotheses: [tex`$f$ and $g$ differentiable at $x$`, tex`$g(x) \neq 0$`],
          source: 'OpenStax Calculus Vol. 1, §3.3',
        },
        {
          id: 'calc-chain-rule',
          title: 'Chain Rule',
          statement: [tex`$\frac{d}{dx}[f(g(x))] = f'(g(x)) \cdot g'(x)$`],
          hypotheses: [tex`$g$ differentiable at $x$`, tex`$f$ differentiable at $g(x)$`],
          source: 'OpenStax Calculus Vol. 1, §3.6',
        },
      ],
    },
    {
      title: '📝 Common Derivatives',
      layout: 'rows',
      facts: [
        { id: 'calc-deriv-constant', title: 'Constant', statement: [tex`$\frac{d}{dx}[c] = 0$`], hypotheses: [], source: 'OpenStax Calculus Vol. 1, §3.3' },
        { id: 'calc-deriv-identity', title: 'Identity', statement: [tex`$\frac{d}{dx}[x] = 1$`], hypotheses: [], source: 'OpenStax Calculus Vol. 1, §3.3' },
        { id: 'calc-deriv-exp', title: 'Natural exponential', statement: [tex`$\frac{d}{dx}[e^x] = e^x$`], hypotheses: [], source: 'OpenStax Calculus Vol. 1, §3.9' },
        {
          id: 'calc-deriv-exp-a',
          title: tex`Exponential, base $a$`,
          statement: [tex`$\frac{d}{dx}[a^x] = a^x \ln a$`],
          hypotheses: [tex`$a > 0$`],
          source: 'OpenStax Calculus Vol. 1, §3.9',
        },
        {
          id: 'calc-deriv-ln',
          title: 'Natural log',
          statement: [tex`$\frac{d}{dx}[\ln x] = \frac{1}{x}$`],
          hypotheses: [tex`$x > 0$`],
          source: 'OpenStax Calculus Vol. 1, §3.9',
        },
        {
          id: 'calc-deriv-log-a',
          title: tex`Log base $a$`,
          statement: [tex`$\frac{d}{dx}[\log_a x] = \frac{1}{x \ln a}$`],
          hypotheses: [tex`$x > 0$`, tex`$a > 0$`, tex`$a \neq 1$`],
          source: 'OpenStax Calculus Vol. 1, §3.9',
        },
        { id: 'calc-deriv-sin', title: 'Sine', statement: [tex`$\frac{d}{dx}[\sin x] = \cos x$`], hypotheses: [RADIANS], source: 'OpenStax Calculus Vol. 1, §3.5' },
        { id: 'calc-deriv-cos', title: 'Cosine', statement: [tex`$\frac{d}{dx}[\cos x] = -\sin x$`], hypotheses: [RADIANS], source: 'OpenStax Calculus Vol. 1, §3.5' },
        {
          id: 'calc-deriv-tan',
          title: 'Tangent',
          statement: [tex`$\frac{d}{dx}[\tan x] = \sec^2 x$`],
          hypotheses: [RADIANS, tex`$\cos x \neq 0$`],
          source: 'OpenStax Calculus Vol. 1, §3.5',
        },
        {
          id: 'calc-deriv-cot',
          title: 'Cotangent',
          statement: [tex`$\frac{d}{dx}[\cot x] = -\csc^2 x$`],
          hypotheses: [RADIANS, tex`$\sin x \neq 0$`],
          source: 'OpenStax Calculus Vol. 1, §3.5',
        },
        {
          id: 'calc-deriv-sec',
          title: 'Secant',
          statement: [tex`$\frac{d}{dx}[\sec x] = \sec x \tan x$`],
          hypotheses: [RADIANS, tex`$\cos x \neq 0$`],
          source: 'OpenStax Calculus Vol. 1, §3.5',
        },
        {
          id: 'calc-deriv-csc',
          title: 'Cosecant',
          statement: [tex`$\frac{d}{dx}[\csc x] = -\csc x \cot x$`],
          hypotheses: [RADIANS, tex`$\sin x \neq 0$`],
          source: 'OpenStax Calculus Vol. 1, §3.5',
        },
      ],
    },
    {
      title: '∫ Integration Rules',
      facts: [
        {
          id: 'calc-int-power-rule',
          title: 'Power Rule',
          statement: [tex`$\int x^n\,dx = \frac{x^{n+1}}{n+1} + C$`],
          hypotheses: [tex`$n \neq -1$`, tex`on an interval where $x^n$ is continuous`],
          source: 'OpenStax Calculus Vol. 1, §4.10',
        },
        {
          id: 'calc-int-constant-multiple-rule',
          title: 'Constant Multiple Rule',
          statement: [tex`$\int cf(x)\,dx = c\int f(x)\,dx$`],
          hypotheses: [tex`$f$ has an antiderivative`, tex`$c$ a constant`],
          source: 'OpenStax Calculus Vol. 1, §4.10',
        },
        {
          id: 'calc-int-sum-rule',
          title: 'Sum/Difference Rule',
          statement: [tex`$\int [f(x) \pm g(x)]\,dx = \int f(x)\,dx \pm \int g(x)\,dx$`],
          hypotheses: [tex`$f$ and $g$ have antiderivatives`],
          source: 'OpenStax Calculus Vol. 1, §4.10',
        },
        {
          id: 'calc-u-substitution',
          title: 'U-Substitution',
          statement: [tex`$\int f(g(x))g'(x)\,dx = \int f(u)\,du$, where $u = g(x)$`],
          hypotheses: [tex`$g'$ continuous on the interval`, tex`$f$ continuous on the range of $g$`],
          source: 'OpenStax Calculus Vol. 1, §5.5',
        },
        {
          id: 'calc-integration-by-parts',
          title: 'Integration by Parts',
          statement: [tex`$\int u\,dv = uv - \int v\,du$`],
          hypotheses: [tex`$u$ and $v$ differentiable with continuous derivatives`],
          source: 'OpenStax Calculus Vol. 2, §3.1',
        },
      ],
    },
    {
      title: '📐 Common Integrals',
      layout: 'rows',
      facts: [
        { id: 'calc-int-zero', title: 'Zero', statement: [tex`$\int 0\,dx = C$`], hypotheses: [], source: 'OpenStax Calculus Vol. 1, §4.10' },
        { id: 'calc-int-constant', title: 'Constant', statement: [tex`$\int k\,dx = kx + C$`], hypotheses: [], source: 'OpenStax Calculus Vol. 1, §4.10' },
        {
          id: 'calc-int-reciprocal',
          title: 'Reciprocal',
          statement: [tex`$\int \frac{1}{x}\,dx = \ln|x| + C$`],
          hypotheses: [tex`$x \neq 0$ (on an interval not containing $0$)`],
          source: 'OpenStax Calculus Vol. 1, §5.6',
        },
        { id: 'calc-int-exp', title: 'Natural exponential', statement: [tex`$\int e^x\,dx = e^x + C$`], hypotheses: [], source: 'OpenStax Calculus Vol. 1, §5.6' },
        {
          id: 'calc-int-exp-a',
          title: tex`Exponential, base $a$`,
          statement: [tex`$\int a^x\,dx = \frac{a^x}{\ln a} + C$`],
          hypotheses: [tex`$a > 0$`, tex`$a \neq 1$`],
          source: 'OpenStax Calculus Vol. 1, §5.6',
        },
        { id: 'calc-int-sin', title: 'Sine', statement: [tex`$\int \sin x\,dx = -\cos x + C$`], hypotheses: [RADIANS], source: 'OpenStax Calculus Vol. 1, §4.10' },
        { id: 'calc-int-cos', title: 'Cosine', statement: [tex`$\int \cos x\,dx = \sin x + C$`], hypotheses: [RADIANS], source: 'OpenStax Calculus Vol. 1, §4.10' },
        {
          id: 'calc-int-sec-squared',
          title: 'Secant squared',
          statement: [tex`$\int \sec^2 x\,dx = \tan x + C$`],
          hypotheses: [RADIANS, tex`on an interval where $\cos x \neq 0$`],
          source: 'OpenStax Calculus Vol. 1, §4.10',
        },
        {
          id: 'calc-int-csc-squared',
          title: 'Cosecant squared',
          statement: [tex`$\int \csc^2 x\,dx = -\cot x + C$`],
          hypotheses: [RADIANS, tex`on an interval where $\sin x \neq 0$`],
          source: 'OpenStax Calculus Vol. 1, §4.10',
        },
        {
          id: 'calc-int-sec-tan',
          title: 'Secant · tangent',
          statement: [tex`$\int \sec x \tan x\,dx = \sec x + C$`],
          hypotheses: [RADIANS, tex`on an interval where $\cos x \neq 0$`],
          source: 'OpenStax Calculus Vol. 1, §4.10',
        },
        {
          id: 'calc-int-csc-cot',
          title: 'Cosecant · cotangent',
          statement: [tex`$\int \csc x \cot x\,dx = -\csc x + C$`],
          hypotheses: [RADIANS, tex`on an interval where $\sin x \neq 0$`],
          source: 'OpenStax Calculus Vol. 1, §4.10',
        },
      ],
    },
    {
      title: '🎯 Important Theorems',
      placement: 'highlight',
      facts: [
        {
          id: 'calc-ftc-1',
          title: 'Fundamental Theorem of Calculus (Part 1)',
          statement: [tex`$F$ is differentiable on $(a, b)$ and $F'(x) = f(x)$`],
          hypotheses: [tex`$f$ is continuous on $[a, b]$`, tex`$F(x) = \int_a^x f(t)\,dt$`],
          source: 'OpenStax Calculus Vol. 1, §5.3',
        },
        {
          id: 'calc-ftc-2',
          title: 'Fundamental Theorem of Calculus (Part 2)',
          statement: [tex`$\int_a^b f(x)\,dx = F(b) - F(a)$`],
          hypotheses: [tex`$f$ is continuous on $[a, b]$`, tex`$F$ is any antiderivative of $f$ on $[a, b]$ ($F' = f$)`],
          source: 'OpenStax Calculus Vol. 1, §5.3',
        },
        {
          id: 'calc-mean-value-theorem',
          title: 'Mean Value Theorem',
          statement: [tex`$\exists\, c \in (a, b)$ such that $f'(c) = \frac{f(b) - f(a)}{b - a}$`],
          hypotheses: [tex`$f$ is continuous on $[a, b]$`, tex`$f$ is differentiable on $(a, b)$`],
          counterexample: tex`$f(x) = |x|$ on $[-1, 1]$ is continuous but not differentiable at $0$, and no $c$ has $f'(c) = \frac{f(1) - f(-1)}{2} = 0$.`,
          source: 'OpenStax Calculus Vol. 1, §4.4',
        },
        {
          id: 'calc-extreme-value-theorem',
          title: 'Extreme Value Theorem',
          statement: [tex`$f$ attains both a maximum and minimum value on $[a, b]$`],
          hypotheses: [tex`$f$ is continuous on the closed interval $[a, b]$`],
          counterexample: tex`$f(x) = \frac{1}{x}$ is continuous on $(0, 1]$ but has no maximum there: the interval must be closed.`,
          source: 'OpenStax Calculus Vol. 1, §4.3',
        },
      ],
    },
    {
      title: '🎲 Limit Laws',
      placement: 'wide',
      note: tex`The laws do not apply to $\infty - \infty$, $0 \cdot \infty$ or $\frac{0}{0}$ forms.`,
      facts: [
        {
          id: 'calc-limit-sum-law',
          title: 'Sum Law',
          statement: [tex`$\lim_{x \to c} [f(x) + g(x)] = \lim_{x \to c} f(x) + \lim_{x \to c} g(x)$`],
          hypotheses: [BOTH_LIMITS],
          source: 'OpenStax Calculus Vol. 1, §2.3',
        },
        {
          id: 'calc-limit-product-law',
          title: 'Product Law',
          statement: [tex`$\lim_{x \to c} [f(x) \cdot g(x)] = \lim_{x \to c} f(x) \cdot \lim_{x \to c} g(x)$`],
          hypotheses: [BOTH_LIMITS],
          source: 'OpenStax Calculus Vol. 1, §2.3',
        },
        {
          id: 'calc-limit-quotient-law',
          title: 'Quotient Law',
          statement: [tex`$\lim_{x \to c} \frac{f(x)}{g(x)} = \frac{\lim_{x \to c} f(x)}{\lim_{x \to c} g(x)}$`],
          hypotheses: [BOTH_LIMITS, tex`$\lim_{x \to c} g(x) \neq 0$`],
          source: 'OpenStax Calculus Vol. 1, §2.3',
        },
        {
          id: 'calc-limit-constant-multiple-law',
          title: 'Constant Multiple Law',
          statement: [tex`$\lim_{x \to c} [k \cdot f(x)] = k \cdot \lim_{x \to c} f(x)$`],
          hypotheses: [tex`$\lim_{x \to c} f(x)$ exists and is finite`, tex`$k$ a constant`],
          source: 'OpenStax Calculus Vol. 1, §2.3',
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Calculus 2
// ---------------------------------------------------------------------------

const RATIO_ROOT_OUTCOMES = tex`$L < 1$: converges (absolutely), $L > 1$ or $L = \infty$: diverges, $L = 1$: inconclusive`;
const POWER_SERIES_DOMAIN = tex`$|x| < R$, where $R > 0$ is the radius of convergence`;

const CALC_2: FactSheet = {
  id: 'calc2',
  title: 'Calculus 2 Formula Reference',
  subtitle: 'Integration techniques, series tests, and more — MATH B6B',
  sections: [
    {
      title: 'Integration Techniques',
      facts: [
        {
          id: 'calc2-integration-by-parts',
          title: 'Integration by Parts',
          statement: [tex`$\int u\,dv = uv - \int v\,du$`],
          hypotheses: [tex`$u$ and $v$ differentiable with continuous derivatives`],
          note: tex`LIATE rule for choosing $u$: Log, Inverse trig, Algebraic, Trig, Exponential`,
          source: 'OpenStax Calculus Vol. 2, §3.1',
        },
        {
          id: 'calc2-trig-substitution',
          title: 'Trig Substitution',
          statement: [
            tex`$\sqrt{a^2 - x^2} \to x = a\sin\theta$`,
            tex`$\sqrt{a^2 + x^2} \to x = a\tan\theta$`,
            tex`$\sqrt{x^2 - a^2} \to x = a\sec\theta$`,
          ],
          hypotheses: [
            tex`$a > 0$`,
            tex`$-\frac{\pi}{2} \leq \theta \leq \frac{\pi}{2}$ for sine, $-\frac{\pi}{2} < \theta < \frac{\pi}{2}$ for tangent, $0 \leq \theta < \frac{\pi}{2}$ or $\frac{\pi}{2} < \theta \leq \pi$ for secant`,
          ],
          note: tex`On these ranges $\sqrt{a^2 - x^2} = a\cos\theta$, $\sqrt{a^2 + x^2} = a\sec\theta$ and $\sqrt{x^2 - a^2} = a|\tan\theta|$.`,
          source: 'OpenStax Calculus Vol. 2, §3.3',
        },
        {
          id: 'calc2-partial-fractions',
          title: 'Partial Fractions',
          statement: [
            tex`Distinct linear: $\frac{A}{x-a} + \frac{B}{x-b}$`,
            tex`Repeated linear: $\frac{A}{x-a} + \frac{B}{(x-a)^2}$`,
            tex`Irreducible quadratic: $\frac{Ax+B}{x^2+bx+c}$`,
          ],
          hypotheses: [
            tex`the rational function $\frac{P(x)}{Q(x)}$ is proper, $\deg P < \deg Q$ (otherwise divide first)`,
            tex`distinct factors have $a \neq b$; an irreducible quadratic has $b^2 - 4c < 0$`,
          ],
          source: 'OpenStax Calculus Vol. 2, §3.4',
        },
        {
          id: 'calc2-trig-sub-examples',
          title: 'Trig Sub Examples',
          statement: [
            tex`$\int \sqrt{a^2-x^2}\,dx \to x = a\sin\theta,\ dx = a\cos\theta\,d\theta$`,
            tex`$\int \frac{dx}{x^2\sqrt{x^2-a^2}} \to x = a\sec\theta$`,
            tex`$\int \frac{dx}{\sqrt{x^2+a^2}} \to x = a\tan\theta$`,
          ],
          hypotheses: [tex`$a > 0$`],
          source: 'OpenStax Calculus Vol. 2, §3.3',
        },
        {
          id: 'calc2-power-reduction',
          title: 'Trig Power Reduction',
          statement: [tex`$\sin^2 x = \frac{1 - \cos 2x}{2}$`, tex`$\cos^2 x = \frac{1 + \cos 2x}{2}$`],
          hypotheses: [],
          source: 'OpenStax Calculus Vol. 2, §3.2',
        },
      ],
    },
    {
      title: 'Convergence Tests',
      facts: [
        {
          id: 'calc2-geometric-series',
          title: 'Geometric Series',
          statement: [tex`$\sum_{n=0}^{\infty} ar^n = \frac{a}{1-r}$`],
          hypotheses: [tex`$|r| < 1$`],
          note: tex`Diverges when $|r| \geq 1$ (if $a \neq 0$)`,
          source: 'OpenStax Calculus Vol. 2, §5.2',
        },
        {
          id: 'calc2-p-series',
          title: 'p-Series Test',
          statement: [tex`$\sum_{n=1}^{\infty} \frac{1}{n^p}$`],
          hypotheses: [tex`$p$ a real constant`],
          conclusion: tex`converges if $p > 1$; diverges if $p \leq 1$`,
          source: 'OpenStax Calculus Vol. 2, §5.3',
        },
        {
          id: 'calc2-ratio-test',
          title: 'Ratio Test',
          statement: [tex`$L = \lim_{n\to\infty} \left|\frac{a_{n+1}}{a_n}\right|$`],
          hypotheses: [tex`$a_n \neq 0$ for all large $n$`, tex`the limit $L$ exists or is $\infty$`],
          conclusion: RATIO_ROOT_OUTCOMES,
          counterexample: tex`$L = 1$ for both $\sum \frac{1}{n}$ (diverges) and $\sum \frac{1}{n^2}$ (converges).`,
          source: 'OpenStax Calculus Vol. 2, §5.6',
        },
        {
          id: 'calc2-root-test',
          title: 'Root Test',
          statement: [tex`$L = \lim_{n\to\infty} |a_n|^{1/n}$`],
          hypotheses: [tex`the limit $L$ exists or is $\infty$`],
          conclusion: tex`Same rules as Ratio Test: ${RATIO_ROOT_OUTCOMES}`,
          source: 'OpenStax Calculus Vol. 2, §5.6',
        },
        {
          id: 'calc2-alternating-series-test',
          title: 'Alternating Series Test',
          statement: [tex`$\sum (-1)^n b_n$ converges`],
          hypotheses: [tex`$b_n > 0$`, tex`$b_n$ is (eventually) decreasing`, tex`$\lim_{n\to\infty} b_n = 0$`],
          source: 'OpenStax Calculus Vol. 2, §5.5',
        },
        {
          id: 'calc2-integral-test',
          title: 'Integral Test',
          statement: [tex`$\sum_{n=N}^{\infty} a_n$ and $\int_N^{\infty} f(x)\,dx$ both converge or both diverge`],
          hypotheses: [tex`$f$ is positive, continuous and decreasing on $[N, \infty)$`, tex`$a_n = f(n)$`],
          note: tex`All three conditions on $f$ (positive, continuous, decreasing) are needed; the test says nothing about the value of the sum`,
          counterexample: tex`$f(x) = \sin^2(\pi x) + \frac{1}{x^2}$ is positive and continuous but not decreasing: $\sum f(n) = \sum \frac{1}{n^2}$ converges while $\int_1^{\infty} f(x)\,dx$ diverges.`,
          source: 'OpenStax Calculus Vol. 2, §5.3',
        },
        {
          id: 'calc2-comparison-test',
          title: 'Comparison Test',
          statement: [tex`$\sum b_n$ converges $\Rightarrow \sum a_n$ converges`],
          hypotheses: [tex`$0 \leq a_n \leq b_n$ (for all $n \geq N$)`],
          conclusion: tex`Equivalently, $\sum a_n$ diverges $\Rightarrow \sum b_n$ diverges`,
          source: 'OpenStax Calculus Vol. 2, §5.4',
        },
        {
          id: 'calc2-divergence-test',
          title: 'Nth-Term (Divergence) Test',
          statement: [tex`$\sum a_n$ diverges`],
          hypotheses: [tex`$\lim_{n\to\infty} a_n \neq 0$ (or the limit does not exist)`],
          counterexample: tex`Warning: $\lim a_n = 0$ does NOT guarantee convergence: $\frac{1}{n} \to 0$ but $\sum \frac{1}{n}$ diverges.`,
          source: 'OpenStax Calculus Vol. 2, §5.3',
        },
      ],
    },
    {
      title: 'Taylor & Maclaurin Series',
      facts: [
        {
          id: 'calc2-taylor-series',
          title: 'Taylor Series of f at a',
          statement: [tex`$T(x) = \sum_{n=0}^{\infty} \frac{f^{(n)}(a)}{n!}(x-a)^n$`],
          hypotheses: [tex`$f$ has derivatives of all orders at $a$`],
          note: tex`$f(x) = T(x)$ exactly when the remainder $R_n(x) = f(x) - T_n(x) \to 0$ as $n \to \infty$.`,
          counterexample: tex`Infinite differentiability alone is not enough: $f(x) = e^{-1/x^2}$ for $x \neq 0$ with $f(0) = 0$ is infinitely differentiable, every $f^{(n)}(0) = 0$, so its Maclaurin series is $0$ although $f(x) \neq 0$ for $x \neq 0$.`,
          source: 'OpenStax Calculus Vol. 2, §6.3',
        },
        {
          id: 'calc2-maclaurin-series',
          title: 'Maclaurin Series (a = 0)',
          statement: [tex`$T(x) = \sum_{n=0}^{\infty} \frac{f^{(n)}(0)}{n!}x^n$`],
          hypotheses: [tex`$f$ has derivatives of all orders at $0$`],
          note: tex`The series below equal their functions on the stated intervals (their remainders $\to 0$ there)`,
          source: 'OpenStax Calculus Vol. 2, §6.3',
        },
      ],
      subsections: [
        {
          title: 'Common Maclaurin Series',
          layout: 'rows',
          facts: [
            {
              id: 'calc2-maclaurin-exp',
              title: 'Exponential',
              statement: [tex`$e^x = \sum_{n=0}^{\infty} \frac{x^n}{n!}$`],
              hypotheses: [ALL_REAL_X],
              source: 'DLMF 4.2.19',
            },
            {
              id: 'calc2-maclaurin-sin',
              title: 'Sine',
              statement: [tex`$\sin x = \sum_{n=0}^{\infty} \frac{(-1)^n x^{2n+1}}{(2n+1)!}$`],
              hypotheses: [ALL_REAL_X],
              source: 'DLMF 4.19.1',
            },
            {
              id: 'calc2-maclaurin-cos',
              title: 'Cosine',
              statement: [tex`$\cos x = \sum_{n=0}^{\infty} \frac{(-1)^n x^{2n}}{(2n)!}$`],
              hypotheses: [ALL_REAL_X],
              source: 'DLMF 4.19.2',
            },
            {
              id: 'calc2-maclaurin-geometric',
              title: 'Geometric',
              statement: [tex`$\frac{1}{1-x} = \sum_{n=0}^{\infty} x^n$`],
              hypotheses: [tex`$|x| < 1$`],
              source: 'OpenStax Calculus Vol. 2, §6.1',
            },
            {
              id: 'calc2-maclaurin-ln',
              title: 'Logarithm',
              statement: [tex`$\ln(1+x) = \sum_{n=1}^{\infty} \frac{(-1)^{n+1} x^n}{n}$`],
              hypotheses: [tex`$-1 < x \leq 1$`],
              source: 'DLMF 4.6.1',
            },
            {
              id: 'calc2-maclaurin-arctan',
              title: 'Arctangent',
              statement: [tex`$\arctan x = \sum_{n=0}^{\infty} \frac{(-1)^n x^{2n+1}}{2n+1}$`],
              hypotheses: [tex`$|x| \leq 1$`],
              source: 'DLMF 4.24.3',
            },
          ],
        },
        {
          title: 'Error Bounds',
          facts: [
            {
              id: 'calc2-lagrange-remainder',
              title: 'Lagrange Remainder',
              statement: [tex`$|R_n(x)| \leq \frac{M|x-a|^{n+1}}{(n+1)!}$`],
              hypotheses: [
                tex`$f$ is $n+1$ times differentiable on an interval containing $a$ and $x$`,
                tex`$M \geq |f^{(n+1)}(c)|$ for every $c$ between $a$ and $x$`,
              ],
              counterexample: tex`$M$ must bound the derivative on the whole interval — e.g. for $e^x$ on $[0, 0.5]$ use $M = e^{0.5}$, not $1$.`,
              source: 'OpenStax Calculus Vol. 2, §6.3',
            },
            {
              id: 'calc2-alternating-series-remainder',
              title: 'Alternating Series Remainder',
              statement: [tex`$|\text{Error}| \leq |a_{n+1}|$ (first omitted term)`],
              hypotheses: [tex`the Alternating Series Test hypotheses (terms decreasing in size to $0$)`],
              source: 'OpenStax Calculus Vol. 2, §5.5',
            },
          ],
        },
      ],
    },
    {
      title: 'Parametric & Polar',
      facts: [
        {
          id: 'calc2-parametric-derivative',
          title: 'Parametric Derivative',
          statement: [tex`$\frac{dy}{dx} = \frac{dy/dt}{dx/dt}$`],
          hypotheses: [tex`$x(t)$ and $y(t)$ differentiable`, tex`$dx/dt \neq 0$`],
          source: 'OpenStax Calculus Vol. 2, §7.2',
        },
        {
          id: 'calc2-parametric-arc-length',
          title: 'Parametric Arc Length',
          statement: [tex`$L = \int_a^b \sqrt{\left(\frac{dx}{dt}\right)^2 + \left(\frac{dy}{dt}\right)^2}\,dt$`],
          hypotheses: [
            tex`$x'(t)$ and $y'(t)$ continuous on $[a, b]$`,
            tex`the curve is traced exactly once for $a \leq t \leq b$`,
          ],
          source: 'OpenStax Calculus Vol. 2, §7.2',
        },
        {
          id: 'calc2-polar-cartesian',
          title: 'Polar ↔ Cartesian',
          statement: [
            tex`$x = r\cos\theta$, $y = r\sin\theta$`,
            tex`$r = \sqrt{x^2 + y^2} \geq 0$, $\theta = \operatorname{atan2}(y, x)$`,
          ],
          hypotheses: [tex`$(x, y) \neq (0, 0)$ for $\theta$: at the origin $r = 0$ and $\theta$ is undefined`],
          note: tex`atan2 is the quadrant-aware angle in $(-\pi, \pi]$: it equals $\arctan(y/x)$ only when $x > 0$; when $x < 0$ add $\pi$ (180°) if $y \geq 0$ and subtract $\pi$ if $y < 0$; $\theta = \pm\frac{\pi}{2}$ (the sign of $y$) when $x = 0$. Add $2\pi$ to negative angles to work in $[0, 2\pi)$ instead.`,
          source: 'OpenStax Calculus Vol. 2, §7.3',
        },
        {
          id: 'calc2-polar-area',
          title: 'Polar Area',
          statement: [tex`$A = \frac{1}{2}\int_a^b r^2\,d\theta$`],
          hypotheses: [tex`$r = f(\theta)$ continuous and $\geq 0$ on $[a, b]$`, tex`$0 < b - a \leq 2\pi$`],
          source: 'OpenStax Calculus Vol. 2, §7.4',
        },
        {
          id: 'calc2-polar-arc-length',
          title: 'Polar Arc Length',
          statement: [tex`$L = \int_a^b \sqrt{r^2 + \left(\frac{dr}{d\theta}\right)^2}\,d\theta$`],
          hypotheses: [
            tex`$r = f(\theta)$ has a continuous derivative on $[a, b]$`,
            tex`the curve is traced exactly once for $a \leq \theta \leq b$`,
          ],
          source: 'OpenStax Calculus Vol. 2, §7.4',
        },
      ],
    },
    {
      title: 'Improper Integrals & Key Sequences',
      placement: 'highlight',
      facts: [
        {
          id: 'calc2-p-integral',
          title: 'p-Integral Test',
          statement: [tex`$\int_1^{\infty} \frac{1}{x^p}\,dx$`],
          hypotheses: [tex`$p$ a real constant`],
          conclusion: tex`converges if and only if $p > 1$`,
          source: 'OpenStax Calculus Vol. 2, §3.7',
        },
        {
          id: 'calc2-comparison-test-integrals',
          title: 'Comparison Test (Integrals)',
          statement: [tex`$\int_a^{\infty} g(x)\,dx$ converges $\Rightarrow \int_a^{\infty} f(x)\,dx$ converges`],
          hypotheses: [tex`$f$ and $g$ continuous on $[a, \infty)$`, tex`$0 \leq f(x) \leq g(x)$ for $x \geq a$`],
          conclusion: tex`Equivalently, if $\int_a^{\infty} f(x)\,dx$ diverges, so does $\int_a^{\infty} g(x)\,dx$`,
          source: 'OpenStax Calculus Vol. 2, §3.7',
        },
        {
          id: 'calc2-arithmetic-sequence',
          title: 'Arithmetic Sequence',
          statement: [tex`$a_n = a_1 + (n-1)d$`],
          hypotheses: [],
          source: 'OpenStax College Algebra 2e, §9.2',
        },
        {
          id: 'calc2-geometric-sequence',
          title: 'Geometric Sequence',
          statement: [tex`$a_n = a_1 \cdot r^{n-1}$`, tex`$S_n = \frac{a_1(1-r^n)}{1-r}$`],
          hypotheses: [tex`$r \neq 1$ for the sum $S_n$`],
          note: tex`$S_n = n \cdot a_1$ when $r = 1$`,
          source: 'OpenStax College Algebra 2e, §9.3, §9.4',
        },
        {
          id: 'calc2-monotone-convergence',
          title: 'Monotone Convergence Theorem',
          statement: [tex`the sequence $\{a_n\}$ converges`],
          hypotheses: [tex`$\{a_n\}$ is bounded`, tex`$\{a_n\}$ is monotonic (eventually non-decreasing or non-increasing)`],
          counterexample: tex`$a_n = (-1)^n$ is bounded but not monotonic, and $a_n = n$ is monotonic but unbounded; neither converges.`,
          source: 'OpenStax Calculus Vol. 2, §5.1',
        },
        {
          id: 'calc2-sequence-convergence',
          title: 'Sequence Convergence',
          statement: [tex`If $\lim_{n\to\infty} a_n = L$ (finite), the sequence converges to $L$`],
          hypotheses: [],
          source: 'OpenStax Calculus Vol. 2, §5.1',
        },
      ],
    },
    {
      title: 'Power Series',
      placement: 'wide',
      facts: [
        {
          id: 'calc2-radius-of-convergence',
          title: 'Radius of Convergence',
          statement: [
            tex`For $\sum a_n(x - c)^n$: $R = \lim_{n\to\infty} \left|\frac{a_n}{a_{n+1}}\right|$`,
            tex`In general $\frac{1}{R} = \limsup_{n\to\infty} |a_n|^{1/n}$ (Cauchy–Hadamard)`,
          ],
          hypotheses: [tex`for the ratio formula: $a_n \neq 0$ for large $n$, provided this limit exists (or is $\infty$)`],
          note: tex`Cauchy–Hadamard always applies, with $R = \infty$ when the lim sup is $0$ and $R = 0$ when it is $\infty$`,
          source: 'OpenStax Calculus Vol. 2, §6.1; Cauchy–Hadamard: Rudin, Principles of Mathematical Analysis, Thm 3.39',
        },
        {
          id: 'calc2-interval-of-convergence',
          title: 'Interval of Convergence',
          statement: [tex`Series converges for $|x - c| < R$.`],
          hypotheses: [tex`$R$ is the radius of convergence of $\sum a_n(x - c)^n$`],
          note: tex`It diverges for $|x - c| > R$. Check endpoints separately.`,
          source: 'OpenStax Calculus Vol. 2, §6.1',
        },
        {
          id: 'calc2-power-series-derivative',
          title: 'Differentiation of Power Series',
          statement: [tex`$\frac{d}{dx}\left[\sum_{n=0}^{\infty} c_n x^n\right] = \sum_{n=1}^{\infty} n \cdot c_n x^{n-1}$`],
          hypotheses: [POWER_SERIES_DOMAIN],
          note: tex`Same $R$; the $n = 0$ term is constant`,
          source: 'OpenStax Calculus Vol. 2, §6.2',
        },
        {
          id: 'calc2-power-series-integral',
          title: 'Integration of Power Series',
          statement: [tex`$\int \sum_{n=0}^{\infty} c_n x^n\,dx = \sum_{n=0}^{\infty} \frac{c_n x^{n+1}}{n+1} + C$`],
          hypotheses: [POWER_SERIES_DOMAIN],
          note: tex`Same $R$`,
          source: 'OpenStax Calculus Vol. 2, §6.2',
        },
      ],
    },
    {
      title: 'Applications of Integration',
      placement: 'wide',
      facts: [
        {
          id: 'calc2-disk-method',
          title: 'Disk Method',
          statement: [tex`$V = \pi\int_a^b [f(x)]^2\,dx$`],
          hypotheses: [tex`$f$ continuous on $[a, b]$`],
          note: tex`Revolve the region between $y = f(x)$ and the x-axis around the x-axis`,
          source: 'OpenStax Calculus Vol. 2, §2.2',
        },
        {
          id: 'calc2-washer-method',
          title: 'Washer Method',
          statement: [tex`$V = \pi\int_a^b \left([R(x)]^2 - [r(x)]^2\right)dx$`],
          hypotheses: [tex`outer radius $R(x) \geq$ inner radius $r(x) \geq 0$ on $[a, b]$`, tex`$R$ and $r$ continuous on $[a, b]$`],
          source: 'OpenStax Calculus Vol. 2, §2.2',
        },
        {
          id: 'calc2-shell-method',
          title: 'Shell Method',
          statement: [tex`$V = 2\pi\int_a^b x\,f(x)\,dx$`],
          hypotheses: [tex`$0 \leq a \leq b$`, tex`$f$ continuous and $f(x) \geq 0$ on $[a, b]$`],
          note: 'Revolve around the y-axis using vertical shells',
          source: 'OpenStax Calculus Vol. 2, §2.3',
        },
        {
          id: 'calc2-arc-length',
          title: 'Arc Length (y = f(x))',
          statement: [tex`$L = \int_a^b \sqrt{1 + [f'(x)]^2}\,dx$`],
          hypotheses: [tex`$f'$ continuous on $[a, b]$`],
          source: 'OpenStax Calculus Vol. 2, §2.4',
        },
        {
          id: 'calc2-surface-area',
          title: 'Surface Area of Revolution',
          statement: [tex`$S = 2\pi\int_a^b |f(x)|\sqrt{1 + [f'(x)]^2}\,dx$`],
          hypotheses: [tex`$f'$ continuous on $[a, b]$`],
          note: tex`Revolve $y = f(x)$ around the x-axis. The radius is the distance $|f(x)|$; the usual form without the absolute value assumes $f(x) \geq 0$ on $[a, b]$`,
          source: 'OpenStax Calculus Vol. 2, §2.4',
        },
        {
          id: 'calc2-work',
          title: 'Work',
          statement: [tex`$W = \int_a^b F(x)\,dx$`],
          hypotheses: [tex`$F$ continuous on $[a, b]$`],
          note: tex`$F(x)$ = force as a function of position`,
          source: 'OpenStax Calculus Vol. 2, §2.5',
        },
      ],
    },
  ],
};

export const FACT_SHEETS: Record<FactSheetKey, FactSheet> = {
  preAlgebra: PRE_ALGEBRA,
  algebra1: ALGEBRA_1,
  geometry: GEOMETRY,
  algebra2: ALGEBRA_2,
  preCalculus: PRE_CALCULUS,
  calculus: CALCULUS,
  calc2: CALC_2,
};

/** Every fact of a section, including its subsections, in display order. */
export function sectionFacts(section: FactSection): Fact[] {
  return [...section.facts, ...(section.subsections ?? []).flatMap(sectionFacts)];
}

/** Every fact of a sheet, in display order. */
export function sheetFacts(sheet: FactSheet): Fact[] {
  return sheet.sections.flatMap(sectionFacts);
}

/** Every fact in the registry. */
export const ALL_FACTS: Fact[] = Object.values(FACT_SHEETS).flatMap(sheetFacts);

/** Look up a fact by id (undefined if absent). */
export function factById(id: string): Fact | undefined {
  return ALL_FACTS.find(f => f.id === id);
}
