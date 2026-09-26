import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import WorkedSolution from './WorkedSolution';
import { generateProblem } from '../services/mathService';

const textOf = (html: string): string =>
  html.replace(/<annotation[^>]*>.*?<\/annotation>/g, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

describe('WorkedSolution', () => {
  it('renders every hypothesis with its check before the conclusion', () => {
    let p = generateProblem('series-convergence', {}, 'ws-0');
    for (let i = 1; p.templateId !== 'integral-test'; i++) p = generateProblem('series-convergence', {}, `ws-${i}`);
    const html = renderToStaticMarkup(React.createElement(WorkedSolution, { steps: p.solution }));
    expect(html).not.toMatch(/katex-error/);
    const text = textOf(html);
    const conditions = ['is positive on', 'is continuous on', 'is decreasing on'];
    for (const c of conditions) expect(text).toContain(c);
    expect(text.indexOf('is decreasing on')).toBeLessThan(text.indexOf('both converge or both diverge'));
    expect(text).toMatch(/So the series (converges|diverges)\./);
  });

  it('renders a derived solution as plain steps', () => {
    const p = generateProblem('addition', {}, 'ws');
    expect(p.solution.every(s => s.kind === 'step')).toBe(true);
    const html = renderToStaticMarkup(React.createElement(WorkedSolution, { steps: p.solution }));
    expect(html).toContain('<ol');
    expect(html).not.toMatch(/katex-error/);
  });
});
