import React from 'react';
import { ArrowLeftIcon } from './Icons';
import MathText from './MathText';

interface Algebra1FormulaSheetProps {
  onComplete: () => void;
}

export default function Algebra1FormulaSheet({ onComplete }: Algebra1FormulaSheetProps) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-6 sm:p-8 shadow-lg border border-slate-700 animate-fade-in">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-cyan-400">Algebra 1 Formula Reference</h2>
          <p className="text-slate-400 text-sm mt-1">Key formulas for equations, inequalities, and polynomials</p>
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
        {/* Linear Equations */}
        <div className="bg-slate-900/50 rounded-lg p-5">
          <h3 className="text-xl font-bold text-amber-300 mb-4">Linear Equations</h3>
          <div className="space-y-3">
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Slope-Intercept Form</p>
              <p className="text-sm text-slate-200 mt-1"><MathText text="$y = mx + b$" /></p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Point-Slope Form</p>
              <p className="text-sm text-slate-200 mt-1"><MathText text="$y - y_1 = m(x - x_1)$" /></p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Standard Form</p>
              <p className="text-sm text-slate-200 mt-1"><MathText text="$Ax + By = C$" /></p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Slope Formula</p>
              <p className="text-sm text-slate-200 mt-1"><MathText text="$m = \frac{y_2 - y_1}{x_2 - x_1}$" /></p>
            </div>
          </div>
        </div>

        {/* Exponent Rules */}
        <div className="bg-slate-900/50 rounded-lg p-5">
          <h3 className="text-xl font-bold text-amber-300 mb-4">Exponent Rules</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Product Rule</span>
              <span className="font-mono text-green-300"><MathText text="$a^m \cdot a^n = a^{m+n}$" /></span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Quotient Rule</span>
              <span className="font-mono text-green-300"><MathText text="$\frac{a^m}{a^n} = a^{m-n}$" /></span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Power Rule</span>
              <span className="font-mono text-green-300"><MathText text="$(a^m)^n = a^{mn}$" /></span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Zero Exponent</span>
              <span className="font-mono text-green-300"><MathText text="$a^0 = 1$" /></span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Negative Exponent</span>
              <span className="font-mono text-green-300"><MathText text="$a^{-n} = \frac{1}{a^n}$" /></span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Product to Power</span>
              <span className="font-mono text-green-300"><MathText text="$(ab)^n = a^n b^n$" /></span>
            </div>
          </div>
        </div>

        {/* Factoring Patterns */}
        <div className="bg-slate-900/50 rounded-lg p-5">
          <h3 className="text-xl font-bold text-amber-300 mb-4">Factoring Patterns</h3>
          <div className="space-y-3">
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Greatest Common Factor</p>
              <p className="text-sm text-slate-200 mt-1"><MathText text="$ab + ac = a(b + c)$" /></p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Difference of Squares</p>
              <p className="text-sm text-slate-200 mt-1"><MathText text="$a^2 - b^2 = (a+b)(a-b)$" /></p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Perfect Square Trinomial</p>
              <p className="text-sm text-slate-200 mt-1"><MathText text="$a^2 + 2ab + b^2 = (a+b)^2$" /></p>
              <p className="text-sm text-slate-200"><MathText text="$a^2 - 2ab + b^2 = (a-b)^2$" /></p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Trinomial</p>
              <p className="text-sm text-slate-200 mt-1"><MathText text="$x^2 + bx + c = (x+p)(x+q)$" /> where <MathText text="$p+q=b$" /> and <MathText text="$pq=c$" /></p>
            </div>
          </div>
        </div>

        {/* Quadratic Equations */}
        <div className="bg-slate-900/50 rounded-lg p-5">
          <h3 className="text-xl font-bold text-amber-300 mb-4">Quadratic Equations</h3>
          <div className="space-y-3">
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Standard Form</p>
              <p className="text-sm text-slate-200 mt-1"><MathText text="$ax^2 + bx + c = 0$" /></p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Quadratic Formula</p>
              <p className="text-sm text-slate-200 mt-1"><MathText text="$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$" /></p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Discriminant</p>
              <p className="text-sm text-slate-200 mt-1"><MathText text="$\Delta = b^2 - 4ac$" /></p>
              <p className="text-xs text-slate-400 mt-1"><MathText text="$\Delta > 0$" />: 2 real solutions | <MathText text="$\Delta = 0$" />: 1 solution | <MathText text="$\Delta < 0$" />: no real solutions</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Vertex Form</p>
              <p className="text-sm text-slate-200 mt-1"><MathText text="$y = a(x-h)^2 + k$" />, vertex at <MathText text="$(h, k)$" /></p>
            </div>
          </div>
        </div>
      </div>

      {/* Inequalities */}
      <div className="mt-6 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-lg p-5">
        <h3 className="text-xl font-bold text-cyan-300 mb-4">Inequality Rules</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-800/50 p-4 rounded">
            <p className="font-semibold text-amber-300 mb-2">Adding/Subtracting</p>
            <p className="text-sm text-slate-300">Direction of inequality stays the same</p>
          </div>
          <div className="bg-slate-800/50 p-4 rounded">
            <p className="font-semibold text-amber-300 mb-2">Multiplying/Dividing by Positive</p>
            <p className="text-sm text-slate-300">Direction of inequality stays the same</p>
          </div>
          <div className="bg-slate-800/50 p-4 rounded">
            <p className="font-semibold text-amber-300 mb-2">Multiplying/Dividing by Negative</p>
            <p className="text-sm text-slate-300">Flip the inequality sign!</p>
          </div>
          <div className="bg-slate-800/50 p-4 rounded">
            <p className="font-semibold text-amber-300 mb-2">Compound Inequalities</p>
            <p className="text-sm text-slate-300"><MathText text="$a < x < b$" /> means <MathText text="$x > a$" /> AND <MathText text="$x < b$" /></p>
          </div>
        </div>
      </div>
    </div>
  );
}
