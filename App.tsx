import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Topic, TopicId, UserProgress } from './types';
import { CURRICULUM } from './constants';
import TopicSelector from './components/TopicSelector';
import PracticeSession from './components/PracticeSession';
import useLocalStorage from './hooks/useLocalStorage';
import StatsDisplay from './components/StatsDisplay';
import MultiplicationTableView from './components/MultiplicationTableView';
import UnitCircleView from './components/UnitCircleView';
import CalculusFormulaSheet from './components/CalculusFormulaSheet';
import SettingsPanel from './components/SettingsPanel';
import { GearIcon } from './components/Icons';
import { useSettings } from './contexts/SettingsContext';

export default function App() {
  const [selectedTopicId, setSelectedTopicId] = useState<TopicId | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { settings } = useSettings();
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

  // Derive mastery from data using current threshold, not persisted boolean
  const isMastered = useCallback((topicId: TopicId): boolean => {
    const progress = userProgress.topicProgress[topicId];
    if (!progress) return false;
    return progress.correct >= settings.masteryThreshold;
  }, [userProgress, settings.masteryThreshold]);

  const unlockedTopics = useMemo(() => {
    const unlocked = new Set<TopicId>();

    if (settings.unlockMode === 'free') {
      CURRICULUM.forEach(level => level.topics.forEach(topic => unlocked.add(topic.id)));
      return unlocked;
    }

    CURRICULUM.forEach(level => {
      level.topics.forEach((topic, index) => {
        if (index === 0) {
          const prevLevel = CURRICULUM[CURRICULUM.indexOf(level) - 1];
          if (!prevLevel) {
            unlocked.add(topic.id);
          } else {
             const lastTopicOfPrevLevel = prevLevel.topics
                .filter(t => t.type !== 'reference')
                .slice(-1)[0];
             if(lastTopicOfPrevLevel && isMastered(lastTopicOfPrevLevel.id)) {
                unlocked.add(topic.id);
             }
          }
        } else {
          const prevTopic = level.topics[index - 1];
          if (isMastered(prevTopic.id) || (prevTopic.type === 'reference' && unlocked.has(prevTopic.id))) {
            unlocked.add(topic.id);
          }
        }
      });
    });
    if (CURRICULUM.length > 0 && CURRICULUM[0].topics.length > 0) {
        unlocked.add(CURRICULUM[0].topics[0].id);
    }
    return unlocked;
  }, [userProgress, settings.unlockMode, isMastered]);

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

  // Resolve system theme
  const resolvedTheme = useMemo(() => {
    if (settings.theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return settings.theme;
  }, [settings.theme]);

  // Apply theme class to document for global light/dark styling
  useEffect(() => {
    document.documentElement.classList.toggle('light-theme', resolvedTheme === 'light');
    document.documentElement.classList.toggle('no-animations', !settings.animationsEnabled);
  }, [resolvedTheme, settings.animationsEnabled]);

  const isDark = resolvedTheme === 'dark';

  return (
    <div className={`min-h-screen font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8 ${isDark ? 'bg-slate-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
       <header className="w-full max-w-4xl mb-8 relative">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
            Math Mastery
          </h1>
          <p className={`mt-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Your journey to becoming a math whiz starts here!</p>
        </div>
        <button
          onClick={() => setSettingsOpen(true)}
          className={`absolute top-1 right-0 p-2 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'}`}
          title="Settings"
        >
          <GearIcon className="w-6 h-6" />
        </button>
      </header>
       {!selectedTopicId && <StatsDisplay userProgress={userProgress} />}
      <main className="w-full max-w-4xl">
        {renderContent()}
      </main>
       <footer className={`w-full max-w-4xl text-center mt-12 text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
        <p>Built with React, TypeScript, and Tailwind CSS. Powered by Gemini.</p>
      </footer>
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        userProgress={userProgress}
        setUserProgress={setUserProgress}
      />
    </div>
  );
}