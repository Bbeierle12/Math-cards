import React from 'react';
import { ArrowLeftIcon } from './Icons';
import MathText from './MathText';

interface PreAlgebraFormulaSheetProps {
  onComplete: () => void;
}

export default function PreAlgebraFormulaSheet({ onComplete }: PreAlgebraFormulaSheetProps) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-6 sm:p-8 shadow-lg border border-slate-700 animate-fade-in">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-cyan-400">Pre-Algebra Formula Reference</h2>
          <p className="text-slate-400 text-sm mt-1">Essential formulas for pre-algebra topics</p>
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
        {/* Order of Operations */}
        <div className="bg-slate-900/50 rounded-lg p-5">
          <h3 className="text-xl font-bold text-amber-300 mb-4">Order of Operations (PEMDAS)</h3>
          <div className="space-y-3">
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">P — Parentheses</p>
              <p className="text-sm text-slate-300 mt-1">Evaluate expressions inside parentheses first</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">E — Exponents</p>
              <p className="text-sm text-slate-300 mt-1">Evaluate powers and roots</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">MD — Multiplication & Division</p>
              <p className="text-sm text-slate-300 mt-1">Left to right</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">AS — Addition & Subtraction</p>
              <p className="text-sm text-slate-300 mt-1">Left to right</p>
            </div>
          </div>
        </div>

        {/* Fraction Rules */}
        <div className="bg-slate-900/50 rounded-lg p-5">
          <h3 className="text-xl font-bold text-amber-300 mb-4">Fraction Rules</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Adding (same denom.)</span>
              <span className="font-mono text-green-300"><MathText text="$\frac{a}{c} + \frac{b}{c} = \frac{a+b}{c}$" /></span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Adding (diff. denom.)</span>
              <span className="font-mono text-green-300"><MathText text="$\frac{a}{b} + \frac{c}{d} = \frac{ad+bc}{bd}$" /></span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Multiplying</span>
              <span className="font-mono text-green-300"><MathText text="$\frac{a}{b} \times \frac{c}{d} = \frac{ac}{bd}$" /></span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Dividing</span>
              <span className="font-mono text-green-300"><MathText text="$\frac{a}{b} \div \frac{c}{d} = \frac{a}{b} \times \frac{d}{c}$" /></span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Cross multiply</span>
              <span className="font-mono text-green-300"><MathText text="$\frac{a}{b} = \frac{c}{d} \Rightarrow ad = bc$" /></span>
            </div>
          </div>
        </div>

        {/* Decimal & Percent */}
        <div className="bg-slate-900/50 rounded-lg p-5">
          <h3 className="text-xl font-bold text-amber-300 mb-4">Decimals & Percents</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Decimal to percent</span>
              <span className="font-mono text-green-300">Multiply by 100</span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Percent to decimal</span>
              <span className="font-mono text-green-300">Divide by 100</span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Fraction to decimal</span>
              <span className="font-mono text-green-300">Divide numerator by denominator</span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Percent of a number</span>
              <span className="font-mono text-green-300"><MathText text="$\frac{p}{100} \times n$" /></span>
            </div>
          </div>
        </div>

        {/* Integer Rules */}
        <div className="bg-slate-900/50 rounded-lg p-5">
          <h3 className="text-xl font-bold text-amber-300 mb-4">Integer Rules</h3>
          <div className="space-y-2 text-sm">
            <div className="bg-slate-800/50 p-2 rounded">
              <p className="text-slate-300"><MathText text="$(+) \times (+) = +$" /></p>
            </div>
            <div className="bg-slate-800/50 p-2 rounded">
              <p className="text-slate-300"><MathText text="$(-) \times (-) = +$" /></p>
            </div>
            <div className="bg-slate-800/50 p-2 rounded">
              <p className="text-slate-300"><MathText text="$(+) \times (-) = -$" /></p>
            </div>
            <div className="bg-slate-800/50 p-2 rounded">
              <p className="text-slate-300">Same rules apply for division</p>
            </div>
            <div className="bg-slate-800/50 p-2 rounded">
              <p className="text-slate-300"><MathText text="$a - (-b) = a + b$" /></p>
            </div>
          </div>
        </div>
      </div>

      {/* Properties */}
      <div className="mt-6 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-lg p-5">
        <h3 className="text-xl font-bold text-cyan-300 mb-4">Number Properties</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-800/50 p-4 rounded">
            <p className="font-semibold text-amber-300 mb-2">Commutative</p>
            <p className="text-sm text-slate-300"><MathText text="$a + b = b + a$" /></p>
            <p className="text-sm text-slate-300"><MathText text="$a \times b = b \times a$" /></p>
          </div>
          <div className="bg-slate-800/50 p-4 rounded">
            <p className="font-semibold text-amber-300 mb-2">Associative</p>
            <p className="text-sm text-slate-300"><MathText text="$(a + b) + c = a + (b + c)$" /></p>
            <p className="text-sm text-slate-300"><MathText text="$(a \times b) \times c = a \times (b \times c)$" /></p>
          </div>
          <div className="bg-slate-800/50 p-4 rounded">
            <p className="font-semibold text-amber-300 mb-2">Distributive</p>
            <p className="text-sm text-slate-300"><MathText text="$a(b + c) = ab + ac$" /></p>
          </div>
          <div className="bg-slate-800/50 p-4 rounded">
            <p className="font-semibold text-amber-300 mb-2">Identity</p>
            <p className="text-sm text-slate-300"><MathText text="$a + 0 = a$" />, <MathText text="$a \times 1 = a$" /></p>
          </div>
        </div>
      </div>
    </div>
  );
}
