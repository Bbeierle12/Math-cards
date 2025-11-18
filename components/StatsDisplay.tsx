
import React from 'react';
import { UserProgress } from '../types';
import { CheckIcon, FlameIcon, TrophyIcon, PercentIcon } from './Icons';

interface StatsDisplayProps {
  userProgress: UserProgress;
}

export default function StatsDisplay({ userProgress }: StatsDisplayProps) {
  const { totalProblemsAttempted, totalCorrect, currentStreak, longestStreak } = userProgress;
  const accuracy = totalProblemsAttempted > 0 ? Math.round((totalCorrect / totalProblemsAttempted) * 100) : 0;

  const stats = [
    { label: 'Accuracy', value: `${accuracy}%`, Icon: PercentIcon },
    { label: 'Total Correct', value: totalCorrect, Icon: CheckIcon },
    { label: 'Current Streak', value: currentStreak, Icon: FlameIcon },
    { label: 'Longest Streak', value: longestStreak, Icon: TrophyIcon },
  ];

  return (
    <div className="w-full max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {stats.map(({ label, value, Icon }) => (
        <div key={label} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex items-center shadow-md">
           <div className="p-3 bg-slate-700 rounded-full mr-4">
             <Icon className="w-6 h-6 text-cyan-400" />
           </div>
           <div>
            <p className="text-slate-400 text-sm font-medium">{label}</p>
            <p className="text-xl sm:text-2xl font-bold text-white">{value}</p>
           </div>
        </div>
      ))}
    </div>
  );
}