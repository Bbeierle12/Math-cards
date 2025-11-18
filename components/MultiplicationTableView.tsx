import React, { useState } from 'react';
import { TopicId } from '../types';
import { ArrowLeftIcon } from './Icons';

interface MultiplicationTableViewProps {
  topicId: TopicId;
  onComplete: () => void;
}

export default function MultiplicationTableView({ topicId, onComplete }: MultiplicationTableViewProps) {
  const [selectedNumber, setSelectedNumber] = useState<number>(7);
  const numbers = Array.from({ length: 12 }, (_, i) => i + 1); // Tables 1-12

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 sm:p-8 shadow-lg border border-slate-700 animate-fade-in">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-cyan-400">Multiplication Tables</h2>
          <p className="text-slate-400 text-sm mt-1">Select a number to view its multiplication table.</p>
        </div>
        <button onClick={onComplete} className="flex items-center text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Back
        </button>
      </div>

      <div className="mb-8">
        <div className="flex flex-wrap justify-center gap-2">
          {numbers.map(num => (
            <button
              key={num}
              onClick={() => setSelectedNumber(num)}
              className={`w-12 h-12 rounded-lg font-bold text-lg transition-all duration-200 transform hover:scale-110 ${
                selectedNumber === num
                  ? 'bg-cyan-600 text-white ring-2 ring-offset-2 ring-offset-slate-800 ring-cyan-400'
                  : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              {num}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700">
        <h3 className="text-2xl font-bold text-center text-amber-300 mb-4">Table of {selectedNumber}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 max-w-md mx-auto">
          {Array.from({ length: 10 }, (_, i) => i + 1).map(multiplier => (
            <div key={multiplier} className="text-lg font-mono text-slate-300 p-2 rounded-md hover:bg-slate-700/50 transition-colors">
              <span className="inline-block w-8 text-right">{selectedNumber}</span>
              <span className="text-cyan-400 mx-2">×</span>
              <span className="inline-block w-8 text-right">{multiplier}</span>
              <span className="text-cyan-400 mx-2">=</span>
              <span className="font-bold text-white inline-block w-10 text-right">{(selectedNumber * multiplier)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Add fade-in animation to index.html if it's not there
const style = document.createElement('style');
style.innerHTML = `
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in {
    animation: fade-in 0.5s ease-out forwards;
  }
`;
document.head.appendChild(style);
