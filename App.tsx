import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Topic, TopicId, UserProgress } from './types';
import { CURRICULUM } from './constants';
import TopicSelector from './components/TopicSelector';
import PracticeSession from './components/PracticeSession';
import useLocalStorage from './hooks/useLocalStorage';
import StatsDisplay from './components/StatsDisplay';
import MultiplicationTableView from './components/MultiplicationTableView';
import UnitCircleView from './components/UnitCircleView';
import CalculusFormulaSheet from './components/CalculusFormulaSheet';
import Calc2FormulaSheet from './components/Calc2FormulaSheet';
import PreAlgebraFormulaSheet from './components/PreAlgebraFormulaSheet';
import Algebra1FormulaSheet from './components/Algebra1FormulaSheet';
import GeometryFormulaSheet from './components/GeometryFormulaSheet';
import Algebra2FormulaSheet from './components/Algebra2FormulaSheet';
import PreCalculusFormulaSheet from './components/PreCalculusFormulaSheet';
import SettingsPanel from './components/SettingsPanel';
import ProfileBadge from './components/ProfileBadge';
import AuthModal from './components/AuthModal';
import ProfileEditModal from './components/ProfileEditModal';
import { GearIcon } from './components/Icons';
import { useSettings } from './contexts/SettingsContext';
import { useAuth } from './contexts/AuthContext';
import { getUserProgress as cloudGetProgress, setUserProgress as cloudSetProgress } from './services/supabaseService';

const DEFAULT_PROGRESS: UserProgress = {
  topicProgress: {},
  totalProblemsAttempted: 0,
  totalCorrect: 0,
  currentStreak: 0,
  longestStreak: 0,
};

export default function App() {
  const [selectedTopicId, setSelectedTopicId] = useState<TopicId | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const { settings } = useSettings();
  const { user } = useAuth();
  const [userProgress, setUserProgressLocal] = useLocalStorage<UserProgress>('userProgress', DEFAULT_PROGRESS);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSyncedRef = useRef(false);

  // On login, sync progress from Supabase
  useEffect(() => {
    if (!user) {
      hasSyncedRef.current = false;
      return;
    }
    if (hasSyncedRef.current) return;
    hasSyncedRef.current = true;

    cloudGetProgress(user.id).then(cloudProgress => {
      if (cloudProgress && cloudProgress.totalProblemsAttempted > 0) {
        setUserProgressLocal(cloudProgress);
      } else {
        cloudSetProgress(user.id, userProgress).catch(console.error);
      }
    }).catch(console.error);
  }, [user]);

  // Wrap setUserProgress to also write to Supabase (debounced)
  const setUserProgress = useCallback((value: UserProgress | ((prev: UserProgress) => UserProgress)) => {
    setUserProgressLocal(prev => {
      const next = value instanceof Function ? value(prev) : value;

      if (user) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          cloudSetProgress(user.id, next).catch(console.error);
        }, 1500);
      }

      return next;
    });
  }, [setUserProgressLocal, user]);

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
        if (selectedTopicId === 'calc2-formulas') {
            return <Calc2FormulaSheet onComplete={handleSessionComplete} />
        }
        if (selectedTopicId === 'pre-algebra-formulas') {
            return <PreAlgebraFormulaSheet onComplete={handleSessionComplete} />
        }
        if (selectedTopicId === 'algebra1-formulas') {
            return <Algebra1FormulaSheet onComplete={handleSessionComplete} />
        }
        if (selectedTopicId === 'geometry-formulas') {
            return <GeometryFormulaSheet onComplete={handleSessionComplete} />
        }
        if (selectedTopicId === 'algebra2-formulas') {
            return <Algebra2FormulaSheet onComplete={handleSessionComplete} />
        }
        if (selectedTopicId === 'precalculus-formulas') {
            return <PreCalculusFormulaSheet onComplete={handleSessionComplete} />
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
        <div className="absolute top-1 right-0 flex items-center gap-1">
          <ProfileBadge
            onSignInClick={() => setAuthModalOpen(true)}
            onEditProfileClick={() => setProfileEditOpen(true)}
            isDark={isDark}
          />
          <button
            onClick={() => setSettingsOpen(true)}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'}`}
            title="Settings"
          >
            <GearIcon className="w-6 h-6" />
          </button>
        </div>
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
        onSignInClick={() => setAuthModalOpen(true)}
        onEditProfileClick={() => setProfileEditOpen(true)}
      />
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <ProfileEditModal isOpen={profileEditOpen} onClose={() => setProfileEditOpen(false)} />
    </div>
  );
}
