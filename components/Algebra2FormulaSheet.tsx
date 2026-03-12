import React from 'react';
import { ArrowLeftIcon } from './Icons';
import MathText from './MathText';

interface Algebra2FormulaSheetProps {
  onComplete: () => void;
}

export default function Algebra2FormulaSheet({ onComplete }: Algebra2FormulaSheetProps) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-6 sm:p-8 shadow-lg border border-slate-700 animate-fade-in">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-cyan-400">Algebra 2 Formula Reference</h2>
          <p className="text-slate-400 text-sm mt-1">Complex numbers, radicals, logarithms, and series</p>
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
        {/* Complex Numbers */}
        <div className="bg-slate-900/50 rounded-lg p-5">
          <h3 className="text-xl font-bold text-amber-300 mb-4">Complex Numbers</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Definition</span>
              <span className="font-mono text-green-300"><MathText text="$i = \sqrt{-1}$" />, <MathText text="$i^2 = -1$" /></span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Standard form</span>
              <span className="font-mono text-green-300"><MathText text="$a + bi$" /></span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Conjugate</span>
              <span className="font-mono text-green-300"><MathText text="$\overline{a + bi} = a - bi$" /></span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Modulus</span>
              <span className="font-mono text-green-300"><MathText text="$|a + bi| = \sqrt{a^2 + b^2}$" /></span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Multiply conjugates</span>
              <span className="font-mono text-green-300"><MathText text="$(a+bi)(a-bi) = a^2 + b^2$" /></span>
            </div>
          </div>
        </div>

        {/* Radical Rules */}
        <div className="bg-slate-900/50 rounded-lg p-5">
          <h3 className="text-xl font-bold text-amber-300 mb-4">Radical Rules</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Product</span>
              <span className="font-mono text-green-300"><MathText text="$\sqrt{ab} = \sqrt{a}\cdot\sqrt{b}$" /></span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Quotient</span>
              <span className="font-mono text-green-300"><MathText text="$\sqrt{\frac{a}{b}} = \frac{\sqrt{a}}{\sqrt{b}}$" /></span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Rational exponent</span>
              <span className="font-mono text-green-300"><MathText text="$a^{m/n} = \sqrt[n]{a^m}$" /></span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Rationalizing</span>
              <span className="font-mono text-green-300"><MathText text="$\frac{1}{\sqrt{a}} = \frac{\sqrt{a}}{a}$" /></span>
            </div>
          </div>
        </div>

        {/* Logarithm Rules */}
        <div className="bg-slate-900/50 rounded-lg p-5">
          <h3 className="text-xl font-bold text-amber-300 mb-4">Logarithm Rules</h3>
          <div className="space-y-3">
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Definition</p>
              <p className="text-sm text-slate-200 mt-1"><MathText text="$\log_b x = y \iff b^y = x$" /></p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Product Rule</p>
              <p className="text-sm text-slate-200 mt-1"><MathText text="$\log_b(xy) = \log_b x + \log_b y$" /></p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Quotient Rule</p>
              <p className="text-sm text-slate-200 mt-1"><MathText text="$\log_b\left(\frac{x}{y}\right) = \log_b x - \log_b y$" /></p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Power Rule</p>
              <p className="text-sm text-slate-200 mt-1"><MathText text="$\log_b(x^n) = n\log_b x$" /></p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Change of Base</p>
              <p className="text-sm text-slate-200 mt-1"><MathText text="$\log_b x = \frac{\ln x}{\ln b}$" /></p>
            </div>
          </div>
        </div>

        {/* Sequences & Series */}
        <div className="bg-slate-900/50 rounded-lg p-5">
          <h3 className="text-xl font-bold text-amber-300 mb-4">Sequences & Series</h3>
          <div className="space-y-3">
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Arithmetic Sequence</p>
              <p className="text-sm text-slate-200 mt-1"><MathText text="$a_n = a_1 + (n-1)d$" /></p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Arithmetic Sum</p>
              <p className="text-sm text-slate-200 mt-1"><MathText text="$S_n = \frac{n}{2}(a_1 + a_n)$" /></p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Geometric Sequence</p>
              <p className="text-sm text-slate-200 mt-1"><MathText text="$a_n = a_1 \cdot r^{n-1}$" /></p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Geometric Sum (finite)</p>
              <p className="text-sm text-slate-200 mt-1"><MathText text="$S_n = a_1 \cdot \frac{1 - r^n}{1 - r}$" /></p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Geometric Sum (infinite, |r| &lt; 1)</p>
              <p className="text-sm text-slate-200 mt-1"><MathText text="$S = \frac{a_1}{1 - r}$" /></p>
            </div>
          </div>
        </div>
      </div>

      {/* Rational Expressions */}
      <div className="mt-6 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-lg p-5">
        <h3 className="text-xl font-bold text-cyan-300 mb-4">Rational Expressions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-800/50 p-4 rounded">
            <p className="font-semibold text-amber-300 mb-2">Multiplying</p>
            <p className="text-sm text-slate-300"><MathText text="$\frac{a}{b} \cdot \frac{c}{d} = \frac{ac}{bd}$" /></p>
          </div>
          <div className="bg-slate-800/50 p-4 rounded">
            <p className="font-semibold text-amber-300 mb-2">Dividing</p>
            <p className="text-sm text-slate-300"><MathText text="$\frac{a}{b} \div \frac{c}{d} = \frac{a}{b} \cdot \frac{d}{c}$" /></p>
          </div>
          <div className="bg-slate-800/50 p-4 rounded">
            <p className="font-semibold text-amber-300 mb-2">Adding (LCD)</p>
            <p className="text-sm text-slate-300">Find LCD, rewrite each fraction, then add numerators</p>
          </div>
          <div className="bg-slate-800/50 p-4 rounded">
            <p className="font-semibold text-amber-300 mb-2">Domain Restriction</p>
            <p className="text-sm text-slate-300">Denominator cannot equal zero</p>
          </div>
        </div>
      </div>
    </div>
  );
}
