import React from 'react';
import { TopicId, UserProgress } from '../types';
import { CURRICULUM } from '../constants';
import ProgressBar from './ProgressBar';
import { LockIcon, PlayIcon, BookOpenIcon, TrophyIcon } from './Icons';
import { useSettings } from '../contexts/SettingsContext';

interface TopicSelectorProps {
  onSelectTopic: (topicId: TopicId) => void;
  userProgress: UserProgress;
  unlockedTopics: Set<TopicId>;
}

export default function TopicSelector({ onSelectTopic, userProgress, unlockedTopics }: TopicSelectorProps) {
  const { settings } = useSettings();
  const masteryThreshold = settings.masteryThreshold;

  return (
    <div className="space-y-8">
      {CURRICULUM.map((level) => (
        <div key={level.id} className="bg-slate-800/50 rounded-xl p-6 shadow-lg border border-slate-700">
          <h2 className="text-2xl font-bold text-cyan-400 mb-4">{level.title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {level.topics.map((topic) => {
              const isUnlocked = unlockedTopics.has(topic.id);
              const isPractice = topic.type !== 'reference';
              const progress = userProgress.topicProgress[topic.id];
              const isMastered = progress?.mastery;
              const masteryPercent = progress ? (progress.correct / masteryThreshold) * 100 : 0;

              return (
                <button
                  key={topic.id}
                  onClick={() => isUnlocked && onSelectTopic(topic.id)}
                  disabled={!isUnlocked}
                  className={`relative text-left p-4 rounded-lg transition-all duration-300 flex flex-col justify-between h-full border
                    ${isUnlocked 
                      ? `bg-slate-700 hover:bg-slate-600 hover:shadow-cyan-500/20 shadow-md transform hover:-translate-y-1 ${isMastered ? 'border-green-500/50' : 'border-transparent'}` 
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border-transparent'
                    }`}
                >
                  <div>
                    <h3 className="text-lg font-semibold flex items-center">
                      {!isUnlocked && <LockIcon className="w-5 h-5 mr-2" />}
                      {topic.title}
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">{topic.description}</p>
                  </div>
                  {isUnlocked && isPractice && (
                    <div className="mt-4">
                      {isMastered ? (
                         <div className="inline-flex items-center gap-2 text-sm font-medium text-green-400 bg-green-500/10 px-3 py-1 rounded-full">
                            <TrophyIcon className="w-4 h-4" />
                            <span>Mastered</span>
                         </div>
                      ) : (
                        <>
                          <ProgressBar percentage={masteryPercent} />
                          <div className="text-xs text-slate-300 mt-1 text-right">{progress?.correct || 0} / {masteryThreshold}</div>
                        </>
                      )}
                    </div>
                  )}
                   {isUnlocked && (
                     <div className="absolute top-3 right-3 text-cyan-400">
                        {isPractice ? <PlayIcon className="w-6 h-6" /> : <BookOpenIcon className="w-6 h-6" />}
                     </div>
                   )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}