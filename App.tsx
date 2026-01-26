import React, { useState, useMemo } from 'react';
import { Topic, TopicId, UserProgress } from './types';
import { CURRICULUM } from './constants';
import TopicSelector from './components/TopicSelector';
import PracticeSession from './components/PracticeSession';
import useLocalStorage from './hooks/useLocalStorage';
import StatsDisplay from './components/StatsDisplay';
import MultiplicationTableView from './components/MultiplicationTableView';
import UnitCircleView from './components/UnitCircleView';
import CalculusFormulaSheet from './components/CalculusFormulaSheet';

export default function App() {
  const [selectedTopicId, setSelectedTopicId] = useState<TopicId | null>(null);
  const [userProgress, setUserProgress] = useLocalStorage<UserProgress>('userProgress', {
    topicProgress: {},
    totalProblemsAttempted: 0,
    totalCorrect: 0,
    currentStreak: 0,
    longestStreak: 0,
  });

  const handleSelectTopic = (topicId: TopicId) => {
    setSelectedTopicId(topicId);
  };

  const handleSessionComplete = () => {
    setSelectedTopicId(null);
  };

  const selectedTopic: Topic | undefined = useMemo(() => {
    if (!selectedTopicId) return undefined;
    for (const level of CURRICULUM) {
      const found = level.topics.find(t => t.id === selectedTopicId);
      if (found) return found;
    }
    return undefined;
  }, [selectedTopicId]);

  const unlockedTopics = useMemo(() => {
    const unlocked = new Set<TopicId>();
    CURRICULUM.forEach(level => {
      level.topics.forEach((topic, index) => {
        // A topic is unlocked if it's the very first one, or if the previous topic is mastered.
        // Reference topics don't count towards unlocking the next one.
        if (index === 0) { // First topic of a level
          const prevLevel = CURRICULUM[CURRICULUM.indexOf(level) - 1];
          if (!prevLevel) { // First topic of the first level
            unlocked.add(topic.id);
          } else { // First topic of a subsequent level
             const lastTopicOfPrevLevel = prevLevel.topics
                .filter(t => t.type !== 'reference')
                .slice(-1)[0];
             if(lastTopicOfPrevLevel && userProgress.topicProgress[lastTopicOfPrevLevel.id]?.mastery) {
                unlocked.add(topic.id);
             }
          }
        } else {
          const prevTopic = level.topics[index - 1];
          if (userProgress.topicProgress[prevTopic.id]?.mastery || prevTopic.type === 'reference' && unlocked.has(prevTopic.id)) {
            unlocked.add(topic.id);
          }
        }
      });
    });
     // Always unlock the very first topic
    if (CURRICULUM.length > 0 && CURRICULUM[0].topics.length > 0) {
        unlocked.add(CURRICULUM[0].topics[0].id);
    }
    return unlocked;
  }, [userProgress]);

  const renderContent = () => {
    if (!selectedTopicId || !selectedTopic) {
        return <TopicSelector
            onSelectTopic={handleSelectTopic}
            userProgress={userProgress}
            unlockedTopics={unlockedTopics}
          />
    }
    if (selectedTopic.type === 'reference') {
        // Render specific reference views based on topic
        if (selectedTopicId === 'multiplication-tables') {
            return <MultiplicationTableView topicId={selectedTopicId} onComplete={handleSessionComplete} />
        }
        if (selectedTopicId === 'unit-circle') {
            return <UnitCircleView topicId={selectedTopicId} onComplete={handleSessionComplete} />
        }
        if (selectedTopicId === 'calculus-formulas') {
            return <CalculusFormulaSheet onComplete={handleSessionComplete} />
        }
    }
    return <PracticeSession
            topicId={selectedTopicId}
            onComplete={handleSessionComplete}
            userProgress={userProgress}
            setUserProgress={setUserProgress}
          />
  }

  return (
    <div className="min-h-screen bg-slate-900 text-gray-100 font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
       <header className="w-full max-w-4xl text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
          Math Mastery
        </h1>
        <p className="text-slate-400 mt-2">Your journey to becoming a math whiz starts here!</p>
      </header>
       {!selectedTopicId && <StatsDisplay userProgress={userProgress} />}
      <main className="w-full max-w-4xl">
        {renderContent()}
      </main>
       <footer className="w-full max-w-4xl text-center mt-12 text-slate-500 text-sm">
        <p>Built with React, TypeScript, and Tailwind CSS.</p>
      </footer>
    </div>
  );
}