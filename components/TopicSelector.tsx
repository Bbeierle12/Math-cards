import React from 'react';
import { TopicId } from '../types';
import { CURRICULUM } from '../constants';
import ProgressBar from './ProgressBar';
import { LockIcon, PlayIcon, BookOpenIcon, TrophyIcon, CheckIcon, TimerIcon } from './Icons';
import type { Learning } from '../hooks/useLearning';
import { templateCount } from '../hooks/useLearning';
import { describeSkill, DAY } from '../services/learning';

interface TopicSelectorProps {
  onSelectTopic: (topicId: TopicId) => void;
  learning: Learning;
  unlockedTopics: Set<TopicId>;
}

const TITLES = new Map(CURRICULUM.flatMap(level => level.topics.map(t => [t.id, t.title] as const)));

const overdue = (dueAt: number, now: number): string => {
  const days = Math.floor((now - dueAt) / DAY);
  return days <= 0 ? 'due today' : `overdue by ${days} day${days === 1 ? '' : 's'}`;
};

export default function TopicSelector({ onSelectTopic, learning, unlockedTopics }: TopicSelectorProps) {
  const { due, now } = learning;
  const dueSet = new Set(due.map(d => d.skillId));

  return (
    <div className="space-y-8">
      {due.length > 0 && (
        <section aria-label="Reviews due" className="bg-amber-500/10 rounded-xl p-6 shadow-lg border border-amber-500/40">
          <h2 className="text-2xl font-bold text-amber-300 mb-1 flex items-center gap-2">
            <TimerIcon className="w-6 h-6" /> Reviews due
          </h2>
          <p className="text-sm text-slate-300 mb-4">
            Spaced reviews keep skills from fading. Passing one moves its next review further out; a skill counts as
            mastered once it survives a review a few days after you reached proficiency.
          </p>
          <div className="flex flex-wrap gap-2">
            {due.map(({ skillId, dueAt }) => (
              <button
                key={skillId}
                onClick={() => onSelectTopic(skillId)}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 border border-amber-500/40 text-left"
              >
                <span className="font-semibold text-white">{TITLES.get(skillId) ?? skillId}</span>
                <span className="block text-xs text-amber-200">{overdue(dueAt, now)}</span>
              </button>
            ))}
          </div>
        </section>
      )}
      {CURRICULUM.map((level) => (
        <div key={level.id} className="bg-slate-800/50 rounded-xl p-6 shadow-lg border border-slate-700">
          <h2 className="text-2xl font-bold text-cyan-400 mb-4">{level.title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {level.topics.map((topic) => {
              const isUnlocked = unlockedTopics.has(topic.id);
              const isPractice = topic.type !== 'reference';
              const progress = isPractice ? describeSkill(learning.skills[topic.id], learning.rules, templateCount(topic.id), now) : null;
              const status = progress?.status;
              const settled = status === 'mastered' || status === 'proficient';

              return (
                <button
                  key={topic.id}
                  onClick={() => isUnlocked && onSelectTopic(topic.id)}
                  disabled={!isUnlocked}
                  className={`relative text-left p-4 rounded-lg transition-all duration-300 flex flex-col justify-between h-full border
                    ${isUnlocked
                      ? `bg-slate-700 hover:bg-slate-600 hover:shadow-cyan-500/20 shadow-md transform hover:-translate-y-1 ${status === 'mastered' ? 'border-green-500/50' : status === 'proficient' ? 'border-cyan-500/40' : 'border-transparent'}`
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border-transparent'
                    }`}
                >
                  <div>
                    <h3 className="text-lg font-semibold flex items-center pr-8">
                      {!isUnlocked && <LockIcon className="w-5 h-5 mr-2" />}
                      {topic.title}
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">{topic.description}</p>
                  </div>
                  {isUnlocked && progress && (
                    <div className="mt-4">
                      {settled ? (
                        <div className="flex flex-wrap items-center gap-2">
                          {status === 'mastered' ? (
                            <span className="inline-flex items-center gap-2 text-sm font-medium text-green-400 bg-green-500/10 px-3 py-1 rounded-full">
                              <TrophyIcon className="w-4 h-4" /> Mastered
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 text-sm font-medium text-cyan-300 bg-cyan-500/10 px-3 py-1 rounded-full">
                              <CheckIcon className="w-4 h-4" /> Proficient
                            </span>
                          )}
                          {dueSet.has(topic.id) && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-300 bg-amber-500/10 px-2 py-1 rounded-full">
                              <TimerIcon className="w-3 h-3" /> Review due
                            </span>
                          )}
                        </div>
                      ) : (
                        <>
                          <ProgressBar percentage={progress.evidenceFraction * 100} />
                          <div className="text-xs text-slate-300 mt-1 flex justify-between gap-2">
                            <span>{progress.templatesRequired > 0 ? `${progress.templatesCovered} / ${progress.templatesRequired} problem types` : ''}</span>
                            <span>{Math.round(progress.evidence * 10) / 10} / {learning.rules.threshold}</span>
                          </div>
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
