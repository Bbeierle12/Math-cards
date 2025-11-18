import React from 'react';
import { ArrowLeftIcon } from './Icons';

interface CalculusFormulaSheetProps {
  onComplete: () => void;
}

export default function CalculusFormulaSheet({ onComplete }: CalculusFormulaSheetProps) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-6 sm:p-8 shadow-lg border border-slate-700 animate-fade-in">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-cyan-400">Calculus Formula Reference</h2>
          <p className="text-slate-400 text-sm mt-1">Essential formulas for derivatives and integrals</p>
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
        {/* Derivative Rules */}
        <div className="bg-slate-900/50 rounded-lg p-5">
          <h3 className="text-xl font-bold text-amber-300 mb-4">📊 Derivative Rules</h3>

          <div className="space-y-3">
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Power Rule</p>
              <p className="font-mono text-sm text-slate-200 mt-1">d/dx[x<sup>n</sup>] = nx<sup>n-1</sup></p>
            </div>

            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Constant Multiple Rule</p>
              <p className="font-mono text-sm text-slate-200 mt-1">d/dx[cf(x)] = c·f'(x)</p>
            </div>

            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Sum/Difference Rule</p>
              <p className="font-mono text-sm text-slate-200 mt-1">d/dx[f(x) ± g(x)] = f'(x) ± g'(x)</p>
            </div>

            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Product Rule</p>
              <p className="font-mono text-sm text-slate-200 mt-1">d/dx[f(x)g(x)] = f'(x)g(x) + f(x)g'(x)</p>
            </div>

            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Quotient Rule</p>
              <p className="font-mono text-sm text-slate-200 mt-1">d/dx[f(x)/g(x)] = [f'(x)g(x) - f(x)g'(x)] / [g(x)]<sup>2</sup></p>
            </div>

            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Chain Rule</p>
              <p className="font-mono text-sm text-slate-200 mt-1">d/dx[f(g(x))] = f'(g(x)) · g'(x)</p>
            </div>
          </div>
        </div>

        {/* Common Derivatives */}
        <div className="bg-slate-900/50 rounded-lg p-5">
          <h3 className="text-xl font-bold text-amber-300 mb-4">📝 Common Derivatives</h3>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">d/dx[c]</span>
              <span className="font-mono text-green-300">= 0</span>
            </div>
            <div className="flex justify-between bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">d/dx[x]</span>
              <span className="font-mono text-green-300">= 1</span>
            </div>
            <div className="flex justify-between bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">d/dx[e<sup>x</sup>]</span>
              <span className="font-mono text-green-300">= e<sup>x</sup></span>
            </div>
            <div className="flex justify-between bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">d/dx[a<sup>x</sup>]</span>
              <span className="font-mono text-green-300">= a<sup>x</sup> ln(a)</span>
            </div>
            <div className="flex justify-between bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">d/dx[ln(x)]</span>
              <span className="font-mono text-green-300">= 1/x</span>
            </div>
            <div className="flex justify-between bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">d/dx[log<sub>a</sub>(x)]</span>
              <span className="font-mono text-green-300">= 1/(x ln(a))</span>
            </div>
            <div className="flex justify-between bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">d/dx[sin(x)]</span>
              <span className="font-mono text-green-300">= cos(x)</span>
            </div>
            <div className="flex justify-between bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">d/dx[cos(x)]</span>
              <span className="font-mono text-green-300">= -sin(x)</span>
            </div>
            <div className="flex justify-between bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">d/dx[tan(x)]</span>
              <span className="font-mono text-green-300">= sec<sup>2</sup>(x)</span>
            </div>
            <div className="flex justify-between bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">d/dx[cot(x)]</span>
              <span className="font-mono text-green-300">= -csc<sup>2</sup>(x)</span>
            </div>
            <div className="flex justify-between bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">d/dx[sec(x)]</span>
              <span className="font-mono text-green-300">= sec(x)tan(x)</span>
            </div>
            <div className="flex justify-between bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">d/dx[csc(x)]</span>
              <span className="font-mono text-green-300">= -csc(x)cot(x)</span>
            </div>
          </div>
        </div>

        {/* Integration Rules */}
        <div className="bg-slate-900/50 rounded-lg p-5">
          <h3 className="text-xl font-bold text-amber-300 mb-4">∫ Integration Rules</h3>

          <div className="space-y-3">
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Power Rule</p>
              <p className="font-mono text-sm text-slate-200 mt-1">∫ x<sup>n</sup> dx = x<sup>n+1</sup>/(n+1) + C  (n ≠ -1)</p>
            </div>

            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Constant Multiple Rule</p>
              <p className="font-mono text-sm text-slate-200 mt-1">∫ cf(x) dx = c∫ f(x) dx</p>
            </div>

            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Sum/Difference Rule</p>
              <p className="font-mono text-sm text-slate-200 mt-1">∫ [f(x) ± g(x)] dx = ∫ f(x) dx ± ∫ g(x) dx</p>
            </div>

            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">U-Substitution</p>
              <p className="font-mono text-sm text-slate-200 mt-1">∫ f(g(x))g'(x) dx = ∫ f(u) du, where u = g(x)</p>
            </div>

            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Integration by Parts</p>
              <p className="font-mono text-sm text-slate-200 mt-1">∫ u dv = uv - ∫ v du</p>
            </div>
          </div>
        </div>

        {/* Common Integrals */}
        <div className="bg-slate-900/50 rounded-lg p-5">
          <h3 className="text-xl font-bold text-amber-300 mb-4">📐 Common Integrals</h3>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">∫ 0 dx</span>
              <span className="font-mono text-green-300">= C</span>
            </div>
            <div className="flex justify-between bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">∫ k dx</span>
              <span className="font-mono text-green-300">= kx + C</span>
            </div>
            <div className="flex justify-between bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">∫ 1/x dx</span>
              <span className="font-mono text-green-300">= ln|x| + C</span>
            </div>
            <div className="flex justify-between bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">∫ e<sup>x</sup> dx</span>
              <span className="font-mono text-green-300">= e<sup>x</sup> + C</span>
            </div>
            <div className="flex justify-between bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">∫ a<sup>x</sup> dx</span>
              <span className="font-mono text-green-300">= a<sup>x</sup>/ln(a) + C</span>
            </div>
            <div className="flex justify-between bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">∫ sin(x) dx</span>
              <span className="font-mono text-green-300">= -cos(x) + C</span>
            </div>
            <div className="flex justify-between bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">∫ cos(x) dx</span>
              <span className="font-mono text-green-300">= sin(x) + C</span>
            </div>
            <div className="flex justify-between bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">∫ sec<sup>2</sup>(x) dx</span>
              <span className="font-mono text-green-300">= tan(x) + C</span>
            </div>
            <div className="flex justify-between bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">∫ csc<sup>2</sup>(x) dx</span>
              <span className="font-mono text-green-300">= -cot(x) + C</span>
            </div>
            <div className="flex justify-between bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">∫ sec(x)tan(x) dx</span>
              <span className="font-mono text-green-300">= sec(x) + C</span>
            </div>
            <div className="flex justify-between bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">∫ csc(x)cot(x) dx</span>
              <span className="font-mono text-green-300">= -csc(x) + C</span>
            </div>
          </div>
        </div>
      </div>

      {/* Important Theorems */}
      <div className="mt-6 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-lg p-5">
        <h3 className="text-xl font-bold text-cyan-300 mb-4">🎯 Important Theorems</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-800/50 p-4 rounded">
            <p className="font-semibold text-amber-300 mb-2">Fundamental Theorem of Calculus (Part 1)</p>
            <p className="text-sm text-slate-300">If F(x) = ∫<sub>a</sub><sup>x</sup> f(t) dt, then F'(x) = f(x)</p>
          </div>

          <div className="bg-slate-800/50 p-4 rounded">
            <p className="font-semibold text-amber-300 mb-2">Fundamental Theorem of Calculus (Part 2)</p>
            <p className="text-sm text-slate-300">∫<sub>a</sub><sup>b</sup> f(x) dx = F(b) - F(a), where F'(x) = f(x)</p>
          </div>

          <div className="bg-slate-800/50 p-4 rounded">
            <p className="font-semibold text-amber-300 mb-2">Mean Value Theorem</p>
            <p className="text-sm text-slate-300">If f is continuous on [a,b] and differentiable on (a,b), then ∃c ∈ (a,b) such that f'(c) = [f(b)-f(a)]/(b-a)</p>
          </div>

          <div className="bg-slate-800/50 p-4 rounded">
            <p className="font-semibold text-amber-300 mb-2">Extreme Value Theorem</p>
            <p className="text-sm text-slate-300">If f is continuous on [a,b], then f attains both a maximum and minimum value on [a,b]</p>
          </div>
        </div>
      </div>

      {/* Limits */}
      <div className="mt-6 bg-slate-900/50 rounded-lg p-5">
        <h3 className="text-xl font-bold text-amber-300 mb-4">🎲 Limit Laws</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="bg-slate-800/50 p-3 rounded">
            <p className="text-slate-300">lim[x→c] [f(x) + g(x)] = lim[x→c] f(x) + lim[x→c] g(x)</p>
          </div>
          <div className="bg-slate-800/50 p-3 rounded">
            <p className="text-slate-300">lim[x→c] [f(x) · g(x)] = lim[x→c] f(x) · lim[x→c] g(x)</p>
          </div>
          <div className="bg-slate-800/50 p-3 rounded">
            <p className="text-slate-300">lim[x→c] [f(x) / g(x)] = lim[x→c] f(x) / lim[x→c] g(x)</p>
          </div>
          <div className="bg-slate-800/50 p-3 rounded">
            <p className="text-slate-300">lim[x→c] [k · f(x)] = k · lim[x→c] f(x)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
