
import React from 'react';

interface ProgressBarProps {
  percentage: number;
}

export default function ProgressBar({ percentage }: ProgressBarProps) {
  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  return (
    <div className="w-full bg-slate-700 rounded-full h-2.5">
      <div
        className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2.5 rounded-full transition-all duration-500 ease-out"
        style={{ width: `${clampedPercentage}%` }}
      ></div>
    </div>
  );
}
