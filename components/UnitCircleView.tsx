import React from 'react';
import { TopicId } from '../types';
import { ArrowLeftIcon } from './Icons';

interface UnitCircleViewProps {
  topicId: TopicId;
  onComplete: () => void;
}

export default function UnitCircleView({ topicId, onComplete }: UnitCircleViewProps) {
  // Unit circle values for special angles
  const angles = [
    { deg: 0, rad: '0', sin: '0', cos: '1', tan: '0', x: 100, y: 0 },
    { deg: 30, rad: 'π/6', sin: '1/2', cos: '√3/2', tan: '√3/3', x: 86.6, y: -50 },
    { deg: 45, rad: 'π/4', sin: '√2/2', cos: '√2/2', tan: '1', x: 70.7, y: -70.7 },
    { deg: 60, rad: 'π/3', sin: '√3/2', cos: '1/2', tan: '√3', x: 50, y: -86.6 },
    { deg: 90, rad: 'π/2', sin: '1', cos: '0', tan: 'undefined', x: 0, y: -100 },
    { deg: 120, rad: '2π/3', sin: '√3/2', cos: '-1/2', tan: '-√3', x: -50, y: -86.6 },
    { deg: 135, rad: '3π/4', sin: '√2/2', cos: '-√2/2', tan: '-1', x: -70.7, y: -70.7 },
    { deg: 150, rad: '5π/6', sin: '1/2', cos: '-√3/2', tan: '-√3/3', x: -86.6, y: -50 },
    { deg: 180, rad: 'π', sin: '0', cos: '-1', tan: '0', x: -100, y: 0 },
    { deg: 210, rad: '7π/6', sin: '-1/2', cos: '-√3/2', tan: '√3/3', x: -86.6, y: 50 },
    { deg: 225, rad: '5π/4', sin: '-√2/2', cos: '-√2/2', tan: '1', x: -70.7, y: 70.7 },
    { deg: 240, rad: '4π/3', sin: '-√3/2', cos: '-1/2', tan: '√3', x: -50, y: 86.6 },
    { deg: 270, rad: '3π/2', sin: '-1', cos: '0', tan: 'undefined', x: 0, y: 100 },
    { deg: 300, rad: '5π/3', sin: '-√3/2', cos: '1/2', tan: '-√3', x: 50, y: 86.6 },
    { deg: 315, rad: '7π/4', sin: '-√2/2', cos: '√2/2', tan: '-1', x: 70.7, y: 70.7 },
    { deg: 330, rad: '11π/6', sin: '-1/2', cos: '√3/2', tan: '-√3/3', x: 86.6, y: 50 },
  ];

  const radius = 100;
  const centerX = 150;
  const centerY = 150;

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 sm:p-8 shadow-lg border border-slate-700 animate-fade-in">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-cyan-400">Unit Circle Reference</h2>
          <p className="text-slate-400 text-sm mt-1">Memorize these special angles and exact values</p>
        </div>
        <button
          onClick={onComplete}
          className="flex items-center text-sm text-cyan-400 hover:text-cyan-300 transition-colors shrink-0 ml-4"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Back
        </button>
      </div>

      <div className="bg-slate-900/50 rounded-lg p-8 my-6">
        {/* SVG Unit Circle */}
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 300 300"
          className="mx-auto max-w-md"
        >
          {/* Grid lines */}
          <line
            x1="0"
            y1={centerY}
            x2="300"
            y2={centerY}
            stroke="#475569"
            strokeWidth="1"
          />
          <line
            x1={centerX}
            y1="0"
            x2={centerX}
            y2="300"
            stroke="#475569"
            strokeWidth="1"
          />

          {/* Circle */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke="#06b6d4"
            strokeWidth="2"
          />

          {/* Angle lines and points */}
          {angles.map((angle) => {
            const x = centerX + angle.x;
            const y = centerY + angle.y;

            return (
              <g key={angle.deg}>
                {/* Line from center to point */}
                <line
                  x1={centerX}
                  y1={centerY}
                  x2={x}
                  y2={y}
                  stroke="#64748b"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
                {/* Point */}
                <circle cx={x} cy={y} r="3" fill="#06b6d4" />
                {/* Angle label */}
                <text
                  x={x + (angle.x > 0 ? 10 : -10)}
                  y={y + (angle.y > 0 ? 15 : -5)}
                  fill="#e2e8f0"
                  fontSize="10"
                  textAnchor={angle.x > 0 ? 'start' : 'end'}
                  className="select-none"
                >
                  {angle.deg}°
                </text>
              </g>
            );
          })}

          {/* Quadrant labels */}
          <text x="220" y="80" fill="#94a3b8" fontSize="12" fontStyle="italic">
            QI
          </text>
          <text x="80" y="80" fill="#94a3b8" fontSize="12" fontStyle="italic">
            QII
          </text>
          <text x="80" y="230" fill="#94a3b8" fontSize="12" fontStyle="italic">
            QIII
          </text>
          <text x="220" y="230" fill="#94a3b8" fontSize="12" fontStyle="italic">
            QIV
          </text>
        </svg>
      </div>

      {/* Reference Table */}
      <div className="mt-6">
        <h3 className="text-xl font-bold text-cyan-400 mb-4">Special Angle Values</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Common angles table */}
          <div className="bg-slate-900/50 rounded-lg p-4">
            <h4 className="font-semibold text-amber-300 mb-3">Most Common Angles</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2 text-slate-400">Angle</th>
                    <th className="text-left py-2 text-slate-400">sin</th>
                    <th className="text-left py-2 text-slate-400">cos</th>
                    <th className="text-left py-2 text-slate-400">tan</th>
                  </tr>
                </thead>
                <tbody>
                  {[0, 30, 45, 60, 90, 120, 135, 150, 180].map((deg) => {
                    const angle = angles.find((a) => a.deg === deg)!;
                    return (
                      <tr key={deg} className="border-b border-slate-800">
                        <td className="py-2 font-mono text-cyan-300">
                          {deg}° ({angle.rad})
                        </td>
                        <td className="py-2 font-mono text-green-300">{angle.sin}</td>
                        <td className="py-2 font-mono text-blue-300">{angle.cos}</td>
                        <td className="py-2 font-mono text-purple-300">{angle.tan}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quadrant reference */}
          <div className="bg-slate-900/50 rounded-lg p-4">
            <h4 className="font-semibold text-amber-300 mb-3">Quadrant Reference</h4>
            <div className="space-y-3 text-sm">
              <div className="bg-slate-800/50 p-3 rounded">
                <p className="font-semibold text-cyan-300">Quadrant I (0° to 90°)</p>
                <p className="text-slate-300 mt-1">All positive: sin, cos, tan</p>
              </div>
              <div className="bg-slate-800/50 p-3 rounded">
                <p className="font-semibold text-cyan-300">Quadrant II (90° to 180°)</p>
                <p className="text-slate-300 mt-1">sin positive, cos & tan negative</p>
              </div>
              <div className="bg-slate-800/50 p-3 rounded">
                <p className="font-semibold text-cyan-300">Quadrant III (180° to 270°)</p>
                <p className="text-slate-300 mt-1">tan positive, sin & cos negative</p>
              </div>
              <div className="bg-slate-800/50 p-3 rounded">
                <p className="font-semibold text-cyan-300">Quadrant IV (270° to 360°)</p>
                <p className="text-slate-300 mt-1">cos positive, sin & tan negative</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key relationships */}
      <div className="mt-6 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg p-4">
        <h4 className="font-semibold text-cyan-300 mb-2">Key Relationships</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-300">
          <div>• sin²θ + cos²θ = 1</div>
          <div>• tan θ = sin θ / cos θ</div>
          <div>• sin(90° - θ) = cos θ</div>
          <div>• cos(90° - θ) = sin θ</div>
          <div>• sin(-θ) = -sin θ</div>
          <div>• cos(-θ) = cos θ</div>
        </div>
      </div>
    </div>
  );
}
