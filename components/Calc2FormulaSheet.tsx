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
                <p>Distinct linear: A/(x−a) + B/(x−b)</p>
                <p>Repeated linear: A/(x−a) + B/(x−a)²</p>
                <p>Irreducible quadratic: (Ax+B)/(x²+bx+c)</p>
              </div>
            </div>

            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Trig Sub Examples</p>
              <div className="font-mono text-sm text-slate-200 mt-1 space-y-1">
                <p>∫ √(a²−x²) dx → x = a sin(θ), dx = a cos(θ) dθ</p>
                <p>∫ dx/(x²√(x²−a²)) → x = a sec(θ)</p>
                <p>∫ dx/√(x²+a²) → x = a tan(θ)</p>
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
              <p className="font-mono text-sm text-slate-200 mt-1">Σ<sub>n=0</sub><sup>∞</sup> arⁿ = a/(1−r) when |r| &lt; 1</p>
              <p className="text-xs text-slate-400 mt-1">Diverges when |r| ≥ 1</p>
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
              <p className="font-mono text-sm text-slate-200 mt-1">Σ (−1)ⁿbₙ converges if bₙ &gt; 0, bₙ is (eventually) decreasing, and lim bₙ = 0</p>
            </div>

            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Integral Test</p>
              <p className="font-mono text-sm text-slate-200 mt-1">If f is positive, continuous and decreasing on [N, ∞) and aₙ = f(n), then Σ<sub>n=N</sub><sup>∞</sup> aₙ and ∫<sub>N</sub><sup>∞</sup> f(x)dx both converge or both diverge</p>
              <p className="text-xs text-slate-400 mt-1">All three hypotheses are needed; the test says nothing about the value of the sum</p>
            </div>

            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Comparison Test</p>
              <p className="font-mono text-sm text-slate-200 mt-1">If 0 ≤ aₙ ≤ bₙ: Σbₙ converges → Σaₙ converges</p>
            </div>

            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Nth-Term (Divergence) Test</p>
              <p className="font-mono text-sm text-slate-200 mt-1">If lim a<sub>n</sub> ≠ 0, then Σ aₙ diverges</p>
              <p className="text-xs text-slate-400 mt-1">Warning: lim aₙ = 0 does NOT guarantee convergence</p>
            </div>
          </div>
        </div>

        {/* Taylor / Maclaurin Series */}
        <div className="bg-slate-900/50 rounded-lg p-5">
          <h3 className="text-xl font-bold text-amber-300 mb-4">Taylor & Maclaurin Series</h3>

          <div className="space-y-3">
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Taylor Series of f at a</p>
              <p className="font-mono text-sm text-slate-200 mt-1">T(x) = Σ<sub>n=0</sub><sup>∞</sup> f<sup>(n)</sup>(a)/n! · (x−a)ⁿ</p>
              <p className="text-xs text-slate-400 mt-1">f(x) = T(x) exactly when the remainder Rₙ(x) = f(x) − Tₙ(x) → 0 as n → ∞. Infinite differentiability alone is not enough: f(x) = e<sup>−1/x²</sup> for x ≠ 0 with f(0) = 0 is infinitely differentiable, every f<sup>(n)</sup>(0) = 0, so its Maclaurin series is 0 although f(x) ≠ 0 for x ≠ 0.</p>
            </div>

            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Maclaurin Series (a = 0)</p>
              <p className="font-mono text-sm text-slate-200 mt-1">T(x) = Σ<sub>n=0</sub><sup>∞</sup> f<sup>(n)</sup>(0)/n! · xⁿ</p>
              <p className="text-xs text-slate-400 mt-1">The series below equal their functions on the stated intervals (their remainders → 0 there)</p>
            </div>
          </div>

          <h4 className="text-sm font-bold text-cyan-200 mt-4 mb-2">Common Maclaurin Series</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">e<sup>x</sup></span>
              <span className="font-mono text-green-300">= Σ xⁿ/n!, all x</span>
            </div>
            <div className="flex justify-between bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">sin(x)</span>
              <span className="font-mono text-green-300">= Σ (−1)ⁿx<sup>2n+1</sup>/(2n+1)!, all x</span>
            </div>
            <div className="flex justify-between bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">cos(x)</span>
              <span className="font-mono text-green-300">= Σ (−1)ⁿx<sup>2n</sup>/(2n)!, all x</span>
            </div>
            <div className="flex justify-between bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">1/(1−x)</span>
              <span className="font-mono text-green-300">= Σ xⁿ, |x| &lt; 1</span>
            </div>
            <div className="flex justify-between bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">ln(1+x)</span>
              <span className="font-mono text-green-300">= Σ<sub>n=1</sub><sup>∞</sup> (−1)<sup>n+1</sup>xⁿ/n, −1 &lt; x ≤ 1</span>
            </div>
            <div className="flex justify-between bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">arctan(x)</span>
              <span className="font-mono text-green-300">= Σ (−1)ⁿx<sup>2n+1</sup>/(2n+1), |x| ≤ 1</span>
            </div>
          </div>

          <h4 className="text-sm font-bold text-cyan-200 mt-4 mb-2">Error Bounds</h4>
          <div className="space-y-2 text-sm">
            <div className="bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300 font-semibold">Lagrange Remainder</span>
              <p className="font-mono text-green-300 mt-1">|Rₙ(x)| ≤ M|x−a|<sup>n+1</sup>/(n+1)!</p>
              <p className="text-xs text-slate-400 mt-1">where M ≥ |f<sup>(n+1)</sup>(c)| for every c between a and x. M must bound the derivative on the whole interval — e.g. for e<sup>x</sup> on [0, 0.5] use M = e<sup>0.5</sup>, not 1.</p>
            </div>
            <div className="bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300 font-semibold">Alternating Series Remainder</span>
              <p className="font-mono text-green-300 mt-1">|Error| ≤ |a<sub>n+1</sub>| (first omitted term)</p>
              <p className="text-xs text-slate-400 mt-1">Requires the Alternating Series Test hypotheses (terms decreasing in size to 0)</p>
            </div>
          </div>
        </div>

        {/* Parametric & Polar */}
        <div className="bg-slate-900/50 rounded-lg p-5">
          <h3 className="text-xl font-bold text-amber-300 mb-4">Parametric & Polar</h3>

          <div className="space-y-3">
            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Parametric Derivative</p>
              <p className="font-mono text-sm text-slate-200 mt-1">dy/dx = (dy/dt) / (dx/dt),  dx/dt ≠ 0</p>
            </div>

            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Parametric Arc Length</p>
              <p className="font-mono text-sm text-slate-200 mt-1">L = ∫ₐᵇ √((dx/dt)² + (dy/dt)²) dt</p>
            </div>

            <div className="bg-slate-800/50 p-3 rounded">
              <p className="font-semibold text-cyan-300">Polar ↔ Cartesian</p>
              <div className="font-mono text-sm text-slate-200 mt-1 space-y-1">
                <p>x = r cos(θ),  y = r sin(θ)</p>
                <p>r = √(x² + y²) ≥ 0,  θ = atan2(y, x)</p>
              </div>
              <p className="text-xs text-slate-400 mt-1">atan2 is the quadrant-aware angle: it equals arctan(y/x) only when x &gt; 0; add π (180°) when x &lt; 0; θ = ±π/2 when x = 0 and y ≠ 0. Fix an interval such as [0, 2π) or (−π, π] to make θ unique. At the origin r = 0 and θ is undefined.</p>
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
            <p className="text-sm text-slate-300">aₙ = a₁ · rⁿ⁻¹,  Sₙ = a₁(1−rⁿ)/(1−r) for r ≠ 1  (Sₙ = n·a₁ when r = 1)</p>
          </div>

          <div className="bg-slate-800/50 p-4 rounded">
            <p className="font-semibold text-amber-300 mb-2">Monotone Convergence Theorem</p>
            <p className="text-sm text-slate-300">A sequence that is bounded and monotonic (eventually non-decreasing or non-increasing) converges</p>
          </div>

          <div className="bg-slate-800/50 p-4 rounded">
            <p className="font-semibold text-amber-300 mb-2">Sequence Convergence</p>
            <p className="text-sm text-slate-300">If lim(n→∞) aₙ = L (finite), the sequence converges to L</p>
          </div>
        </div>
      </div>

      {/* Power Series */}
      <div className="mt-6 bg-slate-900/50 rounded-lg p-5">
        <h3 className="text-xl font-bold text-amber-300 mb-4">Power Series</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="bg-slate-800/50 p-3 rounded">
            <p className="font-semibold text-cyan-300">Radius of Convergence</p>
            <p className="text-slate-300 mt-1">For Σ aₙ(x − c)ⁿ: R = lim |aₙ/aₙ₊₁| provided this limit exists (or is ∞); in general 1/R = lim sup |aₙ|<sup>1/n</sup> (Cauchy–Hadamard), with R = ∞ when the lim sup is 0 and R = 0 when it is ∞</p>
          </div>
          <div className="bg-slate-800/50 p-3 rounded">
            <p className="font-semibold text-cyan-300">Interval of Convergence</p>
            <p className="text-slate-300 mt-1">Series converges for |x − c| &lt; R. Check endpoints separately.</p>
          </div>
          <div className="bg-slate-800/50 p-3 rounded">
            <p className="font-semibold text-cyan-300">Differentiation of Power Series</p>
            <p className="text-slate-300 mt-1">d/dx[Σ<sub>n=0</sub><sup>∞</sup> cₙxⁿ] = Σ<sub>n=1</sub><sup>∞</sup> n·cₙxⁿ⁻¹ (same R; the n = 0 term is constant)</p>
          </div>
          <div className="bg-slate-800/50 p-3 rounded">
            <p className="font-semibold text-cyan-300">Integration of Power Series</p>
            <p className="text-slate-300 mt-1">∫ Σ cₙxⁿ dx = Σ cₙxⁿ⁺¹/(n+1) + C (same R)</p>
          </div>
        </div>
      </div>

      {/* Applications of Integration */}
      <div className="mt-6 bg-slate-900/50 rounded-lg p-5">
        <h3 className="text-xl font-bold text-amber-300 mb-4">Applications of Integration</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="bg-slate-800/50 p-3 rounded">
            <p className="font-semibold text-cyan-300">Disk Method</p>
            <p className="font-mono text-slate-200 mt-1">V = π ∫ₐᵇ [f(x)]² dx</p>
            <p className="text-xs text-slate-400 mt-1">Revolve the region between y=f(x) and the x-axis around the x-axis</p>
          </div>
          <div className="bg-slate-800/50 p-3 rounded">
            <p className="font-semibold text-cyan-300">Washer Method</p>
            <p className="font-mono text-slate-200 mt-1">V = π ∫ₐᵇ ([R(x)]² − [r(x)]²) dx</p>
            <p className="text-xs text-slate-400 mt-1">R = outer radius ≥ r = inner radius ≥ 0 on [a, b]</p>
          </div>
          <div className="bg-slate-800/50 p-3 rounded">
            <p className="font-semibold text-cyan-300">Shell Method</p>
            <p className="font-mono text-slate-200 mt-1">V = 2π ∫ₐᵇ x · f(x) dx</p>
            <p className="text-xs text-slate-400 mt-1">Revolve around the y-axis using vertical shells; requires 0 ≤ a ≤ b and f(x) ≥ 0</p>
          </div>
          <div className="bg-slate-800/50 p-3 rounded">
            <p className="font-semibold text-cyan-300">Arc Length (y = f(x))</p>
            <p className="font-mono text-slate-200 mt-1">L = ∫ₐᵇ √(1 + [f'(x)]²) dx</p>
            <p className="text-xs text-slate-400 mt-1">f' continuous on [a, b]</p>
          </div>
          <div className="bg-slate-800/50 p-3 rounded">
            <p className="font-semibold text-cyan-300">Surface Area of Revolution</p>
            <p className="font-mono text-slate-200 mt-1">S = 2π ∫ₐᵇ |f(x)| √(1 + [f'(x)]²) dx</p>
            <p className="text-xs text-slate-400 mt-1">Revolve y=f(x) around the x-axis. The radius is the distance |f(x)|; the usual form without the absolute value assumes f(x) ≥ 0 on [a, b]</p>
          </div>
          <div className="bg-slate-800/50 p-3 rounded">
            <p className="font-semibold text-cyan-300">Work</p>
            <p className="font-mono text-slate-200 mt-1">W = ∫ₐᵇ F(x) dx</p>
            <p className="text-xs text-slate-400 mt-1">F(x) = force as a function of position</p>
          </div>
        </div>
      </div>
    </div>
  );
}
