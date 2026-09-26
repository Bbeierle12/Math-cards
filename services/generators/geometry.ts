/** Geometry. Problems that say "use π ≈ 3.14" are graded against the 3.14 value only. */
import { PYTHAGOREAN_TRIPLES } from '../../constants';
import type { Draft, GeneratorDef } from './context';
import { degrees, exact, roundTo, roundedTo } from './context';

export const angles: GeneratorDef = {
  topicId: 'angles',
  version: 2,
  generate: (ctx) => {
    const kind = ctx.pick(['complement', 'supplement'] as const);
    const total = kind === 'complement' ? 90 : 180;
    const angle = ctx.int(1, total - 1);
    const word = kind === 'complement' ? 'complementary' : 'supplementary';
    return {
      templateId: kind,
      problemText: `What is the ${word} angle of $${angle}°$?`,
      answer: degrees(total - angle),
      explanation: `${word[0].toUpperCase()}${word.slice(1)} angles add to $${total}°$: $${total}° - ${angle}° = ${total - angle}°$.`,
      hint: kind === 'complement' ? 'Complementary angles add to 90°.' : 'Supplementary angles add to 180°.',
    };
  },
};

export const triangles: GeneratorDef = {
  topicId: 'triangles',
  version: 2,
  generate: (ctx) => {
    const angle1 = ctx.int(30, 80);
    const angle2 = ctx.int(30, 80);
    const angle3 = 180 - angle1 - angle2;
    ctx.require(angle3 > 0, 'positive third angle');
    return {
      templateId: 'angle-sum',
      problemText: `A triangle has angles of $${angle1}°$ and $${angle2}°$. What is the third angle?`,
      answer: degrees(angle3),
      explanation: `The angles of a triangle add to $180°$: $180° - ${angle1}° - ${angle2}° = ${angle3}°$.`,
      hint: 'The sum of angles in a triangle is always 180°.',
    };
  },
};

export const pythagoreanTheorem: GeneratorDef = {
  topicId: 'pythagorean-theorem',
  version: 2,
  generate: (ctx) => {
    const [a, b, c] = ctx.pick(PYTHAGOREAN_TRIPLES);
    const missing = ctx.pick(['a', 'b', 'c'] as const);
    const drafts: Record<typeof missing, Omit<Draft, 'hint'>> = {
      a: {
        templateId: 'find-leg',
        problemText: `A right triangle has leg $b = ${b}$ and hypotenuse $c = ${c}$. Find leg $a$.`,
        answer: exact(a),
        explanation: `$a^2 = c^2 - b^2 = ${c * c} - ${b * b} = ${a * a}$, so $a = \\sqrt{${a * a}} = ${a}$.`,
      },
      b: {
        templateId: 'find-leg',
        problemText: `A right triangle has leg $a = ${a}$ and hypotenuse $c = ${c}$. Find leg $b$.`,
        answer: exact(b),
        explanation: `$b^2 = c^2 - a^2 = ${c * c} - ${a * a} = ${b * b}$, so $b = \\sqrt{${b * b}} = ${b}$.`,
      },
      c: {
        templateId: 'find-hypotenuse',
        problemText: `A right triangle has legs $a = ${a}$ and $b = ${b}$. Find the hypotenuse $c$.`,
        answer: exact(c),
        explanation: `$c^2 = a^2 + b^2 = ${a * a} + ${b * b} = ${c * c}$, so $c = \\sqrt{${c * c}} = ${c}$.`,
      },
    };
    return { ...drafts[missing], hint: 'Pythagorean theorem: $a^2 + b^2 = c^2$, where $c$ is the hypotenuse.' };
  },
};

const PI_NOTE = '(Use $\\pi \\approx 3.14$; round to 2 decimal places.)';

export const areaPerimeter: GeneratorDef = {
  topicId: 'area-perimeter',
  version: 2,
  generate: (ctx) => {
    const shape = ctx.pick(['rectangle', 'square', 'triangle', 'circle'] as const);
    const area = ctx.bool();
    switch (shape) {
      case 'rectangle': {
        const l = ctx.int(5, 15);
        const w = ctx.int(3, 10);
        return area
          ? { templateId: 'rectangle-area', problemText: `Find the area of a rectangle with length $${l}$ and width $${w}$.`, answer: exact(l * w), hint: '$A = l \\times w$', explanation: `$A = l \\times w = ${l} \\times ${w} = ${l * w}$` }
          : { templateId: 'rectangle-perimeter', problemText: `Find the perimeter of a rectangle with length $${l}$ and width $${w}$.`, answer: exact(2 * (l + w)), hint: '$P = 2(l + w)$', explanation: `$P = 2(l + w) = 2(${l} + ${w}) = ${2 * (l + w)}$` };
      }
      case 'square': {
        const s = ctx.int(5, 15);
        return area
          ? { templateId: 'square-area', problemText: `Find the area of a square with side length $${s}$.`, answer: exact(s * s), hint: '$A = s^2$', explanation: `$A = s^2 = ${s}^2 = ${s * s}$` }
          : { templateId: 'square-perimeter', problemText: `Find the perimeter of a square with side length $${s}$.`, answer: exact(4 * s), hint: '$P = 4s$', explanation: `$P = 4s = 4 \\times ${s} = ${4 * s}$` };
      }
      case 'triangle': {
        if (area) {
          let base = ctx.int(6, 12);
          const height = ctx.int(4, 10);
          if (base % 2 === 1 && height % 2 === 1) base += 1; // integer area
          return { templateId: 'triangle-area', problemText: `Find the area of a triangle with base $${base}$ and height $${height}$.`, answer: exact(base * height / 2), hint: '$A = \\frac{1}{2}bh$', explanation: `$A = \\frac{1}{2}bh = \\frac{1}{2} \\times ${base} \\times ${height} = ${base * height / 2}$` };
        }
        const s1 = ctx.int(5, 12);
        const s2 = ctx.int(5, 12);
        const s3 = ctx.int(Math.abs(s1 - s2) + 1, s1 + s2 - 1); // triangle inequality
        ctx.require(s1 + s2 > s3 && s1 + s3 > s2 && s2 + s3 > s1, 'triangle inequality');
        return { templateId: 'triangle-perimeter', problemText: `Find the perimeter of a triangle with sides $${s1}$, $${s2}$, and $${s3}$.`, answer: exact(s1 + s2 + s3), hint: '$P = a + b + c$', explanation: `$P = ${s1} + ${s2} + ${s3} = ${s1 + s2 + s3}$` };
      }
      case 'circle': {
        const r = ctx.int(3, 10);
        if (area) {
          const v = roundTo(3.14 * r * r, 2);
          return { templateId: 'circle-area', problemText: `Find the area of a circle with radius $${r}$. ${PI_NOTE}`, answer: roundedTo(v, 2), hint: '$A = \\pi r^2$', explanation: `$A = \\pi r^2 \\approx 3.14 \\times ${r}^2 = 3.14 \\times ${r * r} = ${v}$` };
        }
        const v = roundTo(2 * 3.14 * r, 2);
        return { templateId: 'circle-circumference', problemText: `Find the circumference of a circle with radius $${r}$. ${PI_NOTE}`, answer: roundedTo(v, 2), hint: '$C = 2\\pi r$', explanation: `$C = 2\\pi r \\approx 2 \\times 3.14 \\times ${r} = ${v}$` };
      }
    }
  },
};

export const circles: GeneratorDef = {
  topicId: 'circles',
  version: 2,
  generate: (ctx) => {
    const r = ctx.int(3, 10);
    const kind = ctx.pick(['circumference', 'area', 'diameter'] as const);
    if (kind === 'diameter') {
      return { templateId: 'diameter', problemText: `A circle has radius $${r}$. What is its diameter?`, answer: exact(2 * r), hint: '$d = 2r$', explanation: `$d = 2r = 2 \\times ${r} = ${2 * r}$` };
    }
    if (kind === 'area') {
      const v = roundTo(3.14 * r * r, 2);
      return { templateId: 'area', problemText: `Find the area of a circle with radius $${r}$. ${PI_NOTE}`, answer: roundedTo(v, 2), hint: '$A = \\pi r^2$', explanation: `$A = \\pi r^2 \\approx 3.14 \\times ${r}^2 = 3.14 \\times ${r * r} = ${v}$` };
    }
    const v = roundTo(2 * 3.14 * r, 2);
    return { templateId: 'circumference', problemText: `Find the circumference of a circle with radius $${r}$. ${PI_NOTE}`, answer: roundedTo(v, 2), hint: '$C = 2\\pi r$', explanation: `$C = 2\\pi r \\approx 2 \\times 3.14 \\times ${r} = ${v}$` };
  },
};

export const volumeSurfaceArea: GeneratorDef = {
  topicId: 'volume-surface-area',
  version: 2,
  generate: (ctx) => {
    const shape = ctx.pick(['cube', 'rectangular-prism', 'cylinder', 'sphere'] as const);
    const volume = ctx.bool();
    switch (shape) {
      case 'cube': {
        const s = ctx.int(3, 8);
        return volume
          ? { templateId: 'cube-volume', problemText: `Find the volume of a cube with side length $${s}$.`, answer: exact(s ** 3), hint: '$V = s^3$', explanation: `$V = s^3 = ${s}^3 = ${s ** 3}$` }
          : { templateId: 'cube-surface', problemText: `Find the surface area of a cube with side length $${s}$.`, answer: exact(6 * s * s), hint: '$SA = 6s^2$', explanation: `$SA = 6s^2 = 6 \\times ${s}^2 = 6 \\times ${s * s} = ${6 * s * s}$` };
      }
      case 'rectangular-prism': {
        const l = ctx.int(4, 10);
        const w = ctx.int(3, 8);
        const h = ctx.int(3, 8);
        return volume
          ? { templateId: 'prism-volume', problemText: `Find the volume of a rectangular prism: $l=${l}$, $w=${w}$, $h=${h}$.`, answer: exact(l * w * h), hint: '$V = lwh$', explanation: `$V = lwh = ${l} \\times ${w} \\times ${h} = ${l * w * h}$` }
          : { templateId: 'prism-surface', problemText: `Find the surface area of a rectangular prism: $l=${l}$, $w=${w}$, $h=${h}$.`, answer: exact(2 * (l * w + l * h + w * h)), hint: '$SA = 2(lw + lh + wh)$', explanation: `$SA = 2(lw + lh + wh) = 2(${l * w} + ${l * h} + ${w * h}) = ${2 * (l * w + l * h + w * h)}$` };
      }
      case 'cylinder': {
        const r = ctx.int(3, 7);
        const h = ctx.int(5, 12);
        if (volume) {
          const v = roundTo(3.14 * r * r * h, 2);
          return { templateId: 'cylinder-volume', problemText: `Find the volume of a cylinder with $r=${r}$, $h=${h}$. ${PI_NOTE}`, answer: roundedTo(v, 2), hint: '$V = \\pi r^2 h$', explanation: `$V = \\pi r^2 h \\approx 3.14 \\times ${r * r} \\times ${h} = ${v}$` };
        }
        const v = roundTo(2 * 3.14 * r * (r + h), 2);
        return { templateId: 'cylinder-surface', problemText: `Find the surface area of a cylinder with $r=${r}$, $h=${h}$. ${PI_NOTE}`, answer: roundedTo(v, 2), hint: '$SA = 2\\pi r(r + h)$', explanation: `$SA = 2\\pi r(r + h) \\approx 2 \\times 3.14 \\times ${r} \\times ${r + h} = ${v}$` };
      }
      case 'sphere': {
        const r = ctx.int(3, 8);
        if (volume) {
          const v = roundTo((4 / 3) * 3.14 * r ** 3, 2);
          return { templateId: 'sphere-volume', problemText: `Find the volume of a sphere with radius $${r}$. ${PI_NOTE}`, answer: roundedTo(v, 2), hint: '$V = \\frac{4}{3}\\pi r^3$', explanation: `$V = \\frac{4}{3}\\pi r^3 \\approx \\frac{4}{3} \\times 3.14 \\times ${r ** 3} = ${v}$` };
        }
        const v = roundTo(4 * 3.14 * r * r, 2);
        return { templateId: 'sphere-surface', problemText: `Find the surface area of a sphere with radius $${r}$. ${PI_NOTE}`, answer: roundedTo(v, 2), hint: '$SA = 4\\pi r^2$', explanation: `$SA = 4\\pi r^2 \\approx 4 \\times 3.14 \\times ${r * r} = ${v}$` };
      }
    }
  },
};
