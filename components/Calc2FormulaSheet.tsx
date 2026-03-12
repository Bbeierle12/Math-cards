import React from 'react';
import { ArrowLeftIcon } from './Icons';

interface Calc2FormulaSheetProps {
  onComplete: () => void;
}

export default function Calc2FormulaSheet({ onComplete }: Calc2FormulaSheetProps) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-6 sm:p-8 shadow-lg border border-slate-700 animate-fade-in">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-cyan-400">Calculus 2 Formula Reference</h2>
          <p className="text-slate-400 text-sm mt-1">Integration techniques, series tests, and more — MATH B6B</p>
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
        {/* Integration Techniques */}
        <div className="bg-slate-900/50 rounded-lg p-5">
          <h3 className="text-xl font-bold text-amber-300 mb-4">Integration Techniques</h3>

          <div className="space-y-3">
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Integration by Parts</p>
              <p className="font-mono text-sm text-slate-200 mt-1">∫ u dv = uv − ∫ v du</p>
              <p className="text-xs text-slate-400 mt-1">LIATE rule for choosing u: Log, Inverse trig, Algebraic, Trig, Exponential</p>
            </div>

            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Trig Substitution</p>
              <div className="font-mono text-sm text-slate-200 mt-1 space-y-1">
                <p>√(a² − x²) → x = a sin(θ)</p>
                <p>√(a² + x²) → x = a tan(θ)</p>
                <p>√(x² − a²) → x = a sec(θ)</p>
              </div>
            </div>

            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Partial Fractions</p>
              <div className="font-mono text-sm text-slate-200 mt-1 space-y-1">
                <p>1/((x−a)(x−b)) = A/(x−a) + B/(x−b)</p>
                <p>1/((x−a)²) = A/(x−a) + B/(x−a)²</p>
              </div>
            </div>

            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Trig Power Reduction</p>
              <div className="font-mono text-sm text-slate-200 mt-1 space-y-1">
                <p>sin²(x) = (1 − cos(2x))/2</p>
                <p>cos²(x) = (1 + cos(2x))/2</p>
              </div>
            </div>
          </div>
        </div>

        {/* Series Convergence Tests */}
        <div className="bg-slate-900/50 rounded-lg p-5">
          <h3 className="text-xl font-bold text-amber-300 mb-4">Convergence Tests</h3>

          <div className="space-y-3">
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Geometric Series</p>
              <p className="font-mono text-sm text-slate-200 mt-1">Σ arⁿ = a/(1−r) when |r| &lt; 1</p>
            </div>

            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">p-Series Test</p>
              <p className="font-mono text-sm text-slate-200 mt-1">Σ 1/nᵖ converges if p &gt; 1</p>
            </div>

            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Ratio Test</p>
              <p className="font-mono text-sm text-slate-200 mt-1">L = lim |a<sub>n+1</sub>/a<sub>n</sub>|</p>
              <p className="text-xs text-slate-400 mt-1">L &lt; 1: converges, L &gt; 1: diverges, L = 1: inconclusive</p>
            </div>

            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Root Test</p>
              <p className="font-mono text-sm text-slate-200 mt-1">L = lim |a<sub>n</sub>|<sup>1/n</sup></p>
              <p className="text-xs text-slate-400 mt-1">Same rules as Ratio Test</p>
            </div>

            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Alternating Series Test</p>
              <p className="font-mono text-sm text-slate-200 mt-1">Σ (−1)ⁿbₙ converges if bₙ is decreasing and lim bₙ = 0</p>
            </div>

            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Integral Test</p>
              <p className="font-mono text-sm text-slate-200 mt-1">Σ f(n) and ∫₁<sup>∞</sup> f(x)dx both converge or both diverge</p>
            </div>

            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Comparison Test</p>
              <p className="font-mono text-sm text-slate-200 mt-1">If 0 ≤ aₙ ≤ bₙ: Σbₙ converges → Σaₙ converges</p>
            </div>
          </div>
        </div>

        {/* Taylor / Maclaurin Series */}
        <div className="bg-slate-900/50 rounded-lg p-5">
          <h3 className="text-xl font-bold text-amber-300 mb-4">Taylor & Maclaurin Series</h3>

          <div className="space-y-3">
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Taylor Series</p>
              <p className="font-mono text-sm text-slate-200 mt-1">f(x) = Σ f<sup>(n)</sup>(a)/n! · (x−a)ⁿ</p>
            </div>

            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Maclaurin Series (a = 0)</p>
              <p className="font-mono text-sm text-slate-200 mt-1">f(x) = Σ f<sup>(n)</sup>(0)/n! · xⁿ</p>
            </div>
          </div>

          <h4 className="text-sm font-bold text-cyan-200 mt-4 mb-2">Common Maclaurin Series</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">e<sup>x</sup></span>
              <span className="font-mono text-green-300">= Σ xⁿ/n!</span>
            </div>
            <div className="flex justify-between bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">sin(x)</span>
              <span className="font-mono text-green-300">= Σ (−1)ⁿx<sup>2n+1</sup>/(2n+1)!</span>
            </div>
            <div className="flex justify-between bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">cos(x)</span>
              <span className="font-mono text-green-300">= Σ (−1)ⁿx<sup>2n</sup>/(2n)!</span>
            </div>
            <div className="flex justify-between bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">1/(1−x)</span>
              <span className="font-mono text-green-300">= Σ xⁿ, |x| &lt; 1</span>
            </div>
            <div className="flex justify-between bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">ln(1+x)</span>
              <span className="font-mono text-green-300">= Σ (−1)<sup>n+1</sup>xⁿ/n, |x| ≤ 1</span>
            </div>
            <div className="flex justify-between bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">arctan(x)</span>
              <span className="font-mono text-green-300">= Σ (−1)ⁿx<sup>2n+1</sup>/(2n+1)</span>
            </div>
          </div>
        </div>

        {/* Parametric & Polar */}
        <div className="bg-slate-900/50 rounded-lg p-5">
          <h3 className="text-xl font-bold text-amber-300 mb-4">Parametric & Polar</h3>

          <div className="space-y-3">
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Parametric Derivative</p>
              <p className="font-mono text-sm text-slate-200 mt-1">dy/dx = (dy/dt) / (dx/dt)</p>
            </div>

            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Parametric Arc Length</p>
              <p className="font-mono text-sm text-slate-200 mt-1">L = ∫ₐᵇ √((dx/dt)² + (dy/dt)²) dt</p>
            </div>

            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Polar ↔ Cartesian</p>
              <div className="font-mono text-sm text-slate-200 mt-1 space-y-1">
                <p>x = r cos(θ),  y = r sin(θ)</p>
                <p>r = √(x² + y²),  θ = arctan(y/x)</p>
              </div>
            </div>

            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Polar Area</p>
              <p className="font-mono text-sm text-slate-200 mt-1">A = ½ ∫ₐᵇ r² dθ</p>
            </div>

            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Polar Arc Length</p>
              <p className="font-mono text-sm text-slate-200 mt-1">L = ∫ₐᵇ √(r² + (dr/dθ)²) dθ</p>
            </div>
          </div>
        </div>
      </div>

      {/* Improper Integrals & Sequences */}
      <div className="mt-6 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-lg p-5">
        <h3 className="text-xl font-bold text-cyan-300 mb-4">Improper Integrals & Key Sequences</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-800/50 p-4 rounded">
            <p className="font-semibold text-amber-300 mb-2">p-Integral Test</p>
            <p className="text-sm text-slate-300">∫₁<sup>∞</sup> 1/xᵖ dx converges iff p &gt; 1</p>
          </div>

          <div className="bg-slate-800/50 p-4 rounded">
            <p className="font-semibold text-amber-300 mb-2">Comparison Test (Integrals)</p>
            <p className="text-sm text-slate-300">If 0 ≤ f(x) ≤ g(x) and ∫g converges, then ∫f converges</p>
          </div>

          <div className="bg-slate-800/50 p-4 rounded">
            <p className="font-semibold text-amber-300 mb-2">Arithmetic Sequence</p>
            <p className="text-sm text-slate-300">aₙ = a₁ + (n−1)d</p>
          </div>

          <div className="bg-slate-800/50 p-4 rounded">
            <p className="font-semibold text-amber-300 mb-2">Geometric Sequence</p>
            <p className="text-sm text-slate-300">aₙ = a₁ · rⁿ⁻¹, Sum = a₁(1−rⁿ)/(1−r)</p>
          </div>
        </div>
      </div>

      {/* Power Series */}
      <div className="mt-6 bg-slate-900/50 rounded-lg p-5">
        <h3 className="text-xl font-bold text-amber-300 mb-4">Power Series</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="bg-slate-800/50 p-3 rounded">
            <p className="font-semibold text-cyan-300">Radius of Convergence</p>
            <p className="text-slate-300 mt-1">R = lim |aₙ/aₙ₊₁| or R = 1/lim |aₙ|<sup>1/n</sup></p>
          </div>
          <div className="bg-slate-800/50 p-3 rounded">
            <p className="font-semibold text-cyan-300">Interval of Convergence</p>
            <p className="text-slate-300 mt-1">Series converges for |x − c| &lt; R. Check endpoints separately.</p>
          </div>
          <div className="bg-slate-800/50 p-3 rounded">
            <p className="font-semibold text-cyan-300">Differentiation of Power Series</p>
            <p className="text-slate-300 mt-1">d/dx[Σ cₙxⁿ] = Σ n·cₙxⁿ⁻¹ (same R)</p>
          </div>
          <div className="bg-slate-800/50 p-3 rounded">
            <p className="font-semibold text-cyan-300">Integration of Power Series</p>
            <p className="text-slate-300 mt-1">∫ Σ cₙxⁿ dx = Σ cₙxⁿ⁺¹/(n+1) + C (same R)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
