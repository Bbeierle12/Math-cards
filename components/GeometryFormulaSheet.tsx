import React from 'react';
import { ArrowLeftIcon } from './Icons';
import MathText from './MathText';

interface GeometryFormulaSheetProps {
  onComplete: () => void;
}

export default function GeometryFormulaSheet({ onComplete }: GeometryFormulaSheetProps) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-6 sm:p-8 shadow-lg border border-slate-700 animate-fade-in">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-cyan-400">Geometry Formula Reference</h2>
          <p className="text-slate-400 text-sm mt-1">Shapes, areas, volumes, and key theorems</p>
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
        {/* 2D Area Formulas */}
        <div className="bg-slate-900/50 rounded-lg p-5">
          <h3 className="text-xl font-bold text-amber-300 mb-4">2D Area Formulas</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Rectangle</span>
              <span className="font-mono text-green-300"><MathText text="$A = lw$" /></span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Triangle</span>
              <span className="font-mono text-green-300"><MathText text="$A = \frac{1}{2}bh$" /></span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Parallelogram</span>
              <span className="font-mono text-green-300"><MathText text="$A = bh$" /></span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Trapezoid</span>
              <span className="font-mono text-green-300"><MathText text="$A = \frac{1}{2}(b_1 + b_2)h$" /></span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Circle</span>
              <span className="font-mono text-green-300"><MathText text="$A = \pi r^2$" /></span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Regular polygon</span>
              <span className="font-mono text-green-300"><MathText text="$A = \frac{1}{2}ap$" /></span>
            </div>
          </div>
        </div>

        {/* Perimeter & Circumference */}
        <div className="bg-slate-900/50 rounded-lg p-5">
          <h3 className="text-xl font-bold text-amber-300 mb-4">Perimeter & Circumference</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Rectangle</span>
              <span className="font-mono text-green-300"><MathText text="$P = 2l + 2w$" /></span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Triangle</span>
              <span className="font-mono text-green-300"><MathText text="$P = a + b + c$" /></span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Circumference</span>
              <span className="font-mono text-green-300"><MathText text="$C = 2\pi r = \pi d$" /></span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Arc length</span>
              <span className="font-mono text-green-300"><MathText text="$s = r\theta$" /> (radians)</span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Sector area</span>
              <span className="font-mono text-green-300"><MathText text="$A = \frac{1}{2}r^2\theta$" /></span>
            </div>
          </div>
        </div>

        {/* 3D Volume */}
        <div className="bg-slate-900/50 rounded-lg p-5">
          <h3 className="text-xl font-bold text-amber-300 mb-4">Volume Formulas</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Rectangular prism</span>
              <span className="font-mono text-green-300"><MathText text="$V = lwh$" /></span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Cylinder</span>
              <span className="font-mono text-green-300"><MathText text="$V = \pi r^2 h$" /></span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Cone</span>
              <span className="font-mono text-green-300"><MathText text="$V = \frac{1}{3}\pi r^2 h$" /></span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Sphere</span>
              <span className="font-mono text-green-300"><MathText text="$V = \frac{4}{3}\pi r^3$" /></span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Pyramid</span>
              <span className="font-mono text-green-300"><MathText text="$V = \frac{1}{3}Bh$" /></span>
            </div>
          </div>
        </div>

        {/* Surface Area */}
        <div className="bg-slate-900/50 rounded-lg p-5">
          <h3 className="text-xl font-bold text-amber-300 mb-4">Surface Area</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Rectangular prism</span>
              <span className="font-mono text-green-300"><MathText text="$SA = 2(lw + lh + wh)$" /></span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Cylinder</span>
              <span className="font-mono text-green-300"><MathText text="$SA = 2\pi r^2 + 2\pi rh$" /></span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Cone</span>
              <span className="font-mono text-green-300"><MathText text="$SA = \pi r^2 + \pi r l$" /></span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300">Sphere</span>
              <span className="font-mono text-green-300"><MathText text="$SA = 4\pi r^2$" /></span>
            </div>
          </div>
        </div>
      </div>

      {/* Key Theorems */}
      <div className="mt-6 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-lg p-5">
        <h3 className="text-xl font-bold text-cyan-300 mb-4">Key Theorems</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-800/50 p-4 rounded">
            <p className="font-semibold text-amber-300 mb-2">Pythagorean Theorem</p>
            <p className="text-sm text-slate-300"><MathText text="$a^2 + b^2 = c^2$" /></p>
          </div>
          <div className="bg-slate-800/50 p-4 rounded">
            <p className="font-semibold text-amber-300 mb-2">Distance Formula</p>
            <p className="text-sm text-slate-300"><MathText text="$d = \sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}$" /></p>
          </div>
          <div className="bg-slate-800/50 p-4 rounded">
            <p className="font-semibold text-amber-300 mb-2">Midpoint Formula</p>
            <p className="text-sm text-slate-300"><MathText text="$M = \left(\frac{x_1+x_2}{2}, \frac{y_1+y_2}{2}\right)$" /></p>
          </div>
          <div className="bg-slate-800/50 p-4 rounded">
            <p className="font-semibold text-amber-300 mb-2">Triangle Angle Sum</p>
            <p className="text-sm text-slate-300">Interior angles sum to <MathText text="$180°$" /></p>
          </div>
        </div>
      </div>
    </div>
  );
}
