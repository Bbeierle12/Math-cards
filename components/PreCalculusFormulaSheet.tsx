import React from 'react';
import { ArrowLeftIcon } from './Icons';
import MathText from './MathText';

interface PreCalculusFormulaSheetProps {
  onComplete: () => void;
}

export default function PreCalculusFormulaSheet({ onComplete }: PreCalculusFormulaSheetProps) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-6 sm:p-8 shadow-lg border border-slate-700 animate-fade-in">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-cyan-400">Pre-Calculus Formula Reference</h2>
          <p className="text-slate-400 text-sm mt-1">Functions, transformations, and conic sections</p>
        </div>
        <button
          onClick={onComplete}
          className="flex items-center text-sm text-cyan-400 hover:text-cyan-300 transition-colors shrink-0 ml-4"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Back
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Function Transformations */}
        <div className="bg-slate-900/50 rounded-lg p-5">
          <h3 className="text-xl font-bold text-amber-300 mb-4">Function Transformations</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Vertical shift up</span>
              <span className="font-mono text-green-300"><MathText text="$f(x) + k$" /></span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Vertical shift down</span>
              <span className="font-mono text-green-300"><MathText text="$f(x) - k$" /></span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Horizontal shift left</span>
              <span className="font-mono text-green-300"><MathText text="$f(x + h)$" /></span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Horizontal shift right</span>
              <span className="font-mono text-green-300"><MathText text="$f(x - h)$" /></span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Vertical stretch</span>
              <span className="font-mono text-green-300"><MathText text="$af(x)$" />, <MathText text="$a > 1$" /></span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Reflect over x-axis</span>
              <span className="font-mono text-green-300"><MathText text="$-f(x)$" /></span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Reflect over y-axis</span>
              <span className="font-mono text-green-300"><MathText text="$f(-x)$" /></span>
            </div>
          </div>
        </div>

        {/* Polynomial Functions */}
        <div className="bg-slate-900/50 rounded-lg p-5">
          <h3 className="text-xl font-bold text-amber-300 mb-4">Polynomial Functions</h3>
          <div className="space-y-3">
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">End Behavior</p>
              <p className="text-sm text-slate-200 mt-1">Even degree, positive lead: both ends up</p>
              <p className="text-sm text-slate-200">Odd degree, positive lead: left down, right up</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Rational Root Theorem</p>
              <p className="text-sm text-slate-200 mt-1">Possible roots: <MathText text="$\pm\frac{p}{q}$" /> where <MathText text="$p$" /> | constant, <MathText text="$q$" /> | leading coeff.</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Remainder Theorem</p>
              <p className="text-sm text-slate-200 mt-1">When <MathText text="$f(x)$" /> is divided by <MathText text="$(x - c)$" />, remainder = <MathText text="$f(c)$" /></p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Fundamental Theorem of Algebra</p>
              <p className="text-sm text-slate-200 mt-1">Degree <MathText text="$n$" /> polynomial has exactly <MathText text="$n$" /> roots (with multiplicity, over <MathText text="$\mathbb{C}$" />)</p>
            </div>
          </div>
        </div>

        {/* Rational Functions */}
        <div className="bg-slate-900/50 rounded-lg p-5">
          <h3 className="text-xl font-bold text-amber-300 mb-4">Rational Functions</h3>
          <div className="space-y-3">
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Vertical Asymptotes</p>
              <p className="text-sm text-slate-200 mt-1">Zeros of the denominator of the fully reduced fraction (after cancelling common factors)</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Horizontal Asymptotes</p>
              <p className="text-sm text-slate-200 mt-1">deg(num) &lt; deg(den): <MathText text="$y = 0$" /></p>
              <p className="text-sm text-slate-200">deg(num) = deg(den): <MathText text="$y = \frac{a_n}{b_n}$" /> (ratio of the leading coefficients)</p>
              <p className="text-sm text-slate-200">deg(num) = deg(den) + 1: no HA; a slant (oblique) linear asymptote <MathText text="$y = mx + b$" />, the quotient from polynomial division</p>
              <p className="text-sm text-slate-200">deg(num) ≥ deg(den) + 2: no HA and no slant line; the graph follows the polynomial quotient (a curved asymptote)</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Holes</p>
              <p className="text-sm text-slate-200 mt-1">A factor <MathText text="$(x - c)$" /> that cancels completely out of the denominator gives a hole at <MathText text="$x = c$" />.</p>
              <p className="text-xs text-slate-400 mt-1">If <MathText text="$(x - c)$" /> still divides the reduced denominator, <MathText text="$x = c$" /> is a vertical asymptote, not a hole: <MathText text="$\frac{x-1}{(x-1)^2} = \frac{1}{x-1}$" /> has a VA at <MathText text="$x = 1$" />.</p>
            </div>
          </div>
        </div>

        {/* Exponential & Log Functions */}
        <div className="bg-slate-900/50 rounded-lg p-5">
          <h3 className="text-xl font-bold text-amber-300 mb-4">Exponential Functions</h3>
          <div className="space-y-3">
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Growth/Decay</p>
              <p className="text-sm text-slate-200 mt-1"><MathText text="$f(x) = a \cdot b^x$" /></p>
              <p className="text-xs text-slate-400 mt-1"><MathText text="$b > 1$" />: growth | <MathText text="$0 < b < 1$" />: decay</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Continuous Growth</p>
              <p className="text-sm text-slate-200 mt-1"><MathText text="$A = Pe^{rt}$" /></p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Compound Interest</p>
              <p className="text-sm text-slate-200 mt-1"><MathText text="$A = P\left(1 + \frac{r}{n}\right)^{nt}$" /></p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Natural Log Inverse</p>
              <p className="text-sm text-slate-200 mt-1"><MathText text="$e^{\ln x} = x$" /> and <MathText text="$\ln(e^x) = x$" /></p>
            </div>
          </div>
        </div>
      </div>

      {/* Conic Sections */}
      <div className="mt-6 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-lg p-5">
        <h3 className="text-xl font-bold text-cyan-300 mb-4">Conic Sections</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-800/50 p-4 rounded">
            <p className="font-semibold text-amber-300 mb-2">Circle</p>
            <p className="text-sm text-slate-300"><MathText text="$(x-h)^2 + (y-k)^2 = r^2$" /></p>
            <p className="text-xs text-slate-400 mt-1">Center <MathText text="$(h,k)$" />, radius <MathText text="$r$" /></p>
          </div>
          <div className="bg-slate-800/50 p-4 rounded">
            <p className="font-semibold text-amber-300 mb-2">Ellipse</p>
            <p className="text-sm text-slate-300"><MathText text="$\frac{(x-h)^2}{a^2} + \frac{(y-k)^2}{b^2} = 1$" />, <MathText text="$a \geq b > 0$" /></p>
            <p className="text-xs text-slate-400 mt-1">Horizontal major axis of length <MathText text="$2a$" />; foci at <MathText text="$(h \pm c, k)$" /> with <MathText text="$c^2 = a^2 - b^2$" />. If the larger denominator is under <MathText text="$(y-k)^2$" />, the major axis is vertical and the foci are <MathText text="$(h, k \pm c)$" />.</p>
          </div>
          <div className="bg-slate-800/50 p-4 rounded">
            <p className="font-semibold text-amber-300 mb-2">Hyperbola</p>
            <p className="text-sm text-slate-300"><MathText text="$\frac{(x-h)^2}{a^2} - \frac{(y-k)^2}{b^2} = 1$" /> (opens left/right)</p>
            <p className="text-xs text-slate-400 mt-1">Foci <MathText text="$(h \pm c, k)$" /> with <MathText text="$c^2 = a^2 + b^2$" />; asymptotes <MathText text="$y - k = \pm\frac{b}{a}(x - h)$" />. For <MathText text="$\frac{(y-k)^2}{a^2} - \frac{(x-h)^2}{b^2} = 1$" /> it opens up/down with asymptotes <MathText text="$y - k = \pm\frac{a}{b}(x - h)$" />.</p>
          </div>
          <div className="bg-slate-800/50 p-4 rounded">
            <p className="font-semibold text-amber-300 mb-2">Parabola</p>
            <p className="text-sm text-slate-300"><MathText text="$(x-h)^2 = 4p(y-k)$" /> (vertical axis): focus <MathText text="$(h, k+p)$" />, directrix <MathText text="$y = k - p$" /></p>
            <p className="text-sm text-slate-300"><MathText text="$(y-k)^2 = 4p(x-h)$" /> (horizontal axis): focus <MathText text="$(h+p, k)$" />, directrix <MathText text="$x = h - p$" /></p>
            <p className="text-xs text-slate-400 mt-1">Vertex <MathText text="$(h,k)$" />; the focus is <MathText text="$|p|$" /> from the vertex and the sign of <MathText text="$p$" /> gives the opening direction (<MathText text="$p > 0$" />: up / right)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
