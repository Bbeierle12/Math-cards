
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { TopicId, Problem, UserProgress, FractionAnswer, CoordinateAnswer } from '../types';
import { generateProblem, validateAnswer } from '../services/mathService';
import { CURRICULUM } from '../constants';
import ProgressBar from './ProgressBar';
import { ArrowLeftIcon, LightbulbIcon, LoaderIcon, TrophyIcon, TimerIcon } from './Icons';
import { useSettings } from '../contexts/SettingsContext';

interface PracticeSessionProps {
  topicId: TopicId;
  onComplete: () => void;
  userProgress: UserProgress;
  setUserProgress: (value: UserProgress | ((prev: UserProgress) => UserProgress)) => void;
}

function formatAnswer(answer: Problem['correctAnswer']): string {
  if (typeof answer === 'number' || typeof answer === 'string') return String(answer);
  if (Array.isArray(answer)) return answer.map((v, i) => `x${i + 1}=${v}`).join(', ');
  if ('numerator' in answer && 'denominator' in answer) return `${(answer as FractionAnswer).numerator}/${(answer as FractionAnswer).denominator}`;
  if ('x' in answer && 'y' in answer) return `(${(answer as CoordinateAnswer).x}, ${(answer as CoordinateAnswer).y})`;
  return String(answer);
}

export default function PracticeSession({ topicId, onComplete, userProgress, setUserProgress }: PracticeSessionProps) {
  const { settings } = useSettings();
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [fractionNumerator, setFractionNumerator] = useState('');
  const [fractionDenominator, setFractionDenominator] = useState('');
  const [answerStatus, setAnswerStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [showHint, setShowHint] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [timerRemaining, setTimerRemaining] = useState(settings.timerDurationSeconds);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const masteryThreshold = settings.masteryThreshold;

  const topicProgress = useMemo(() => {
    return userProgress.topicProgress[topicId] || { correct: 0, attempted: 0, mastery: false };
  }, [userProgress, topicId]);

  const topicInfo = useMemo(() => {
    for (const level of CURRICULUM) {
      const topic = level.topics.find(t => t.id === topicId);
      if (topic) return topic;
    }
    return { title: 'Unknown Topic', description: ''};
  }, [topicId]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    setTimerRemaining(settings.timerDurationSeconds);
    if (!settings.timerEnabled) return;
    timerRef.current = setInterval(() => {
      setTimerRemaining(prev => {
        if (prev <= 1) {
          stopTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [settings.timerEnabled, settings.timerDurationSeconds, stopTimer]);

  const generateNewProblem = useCallback(() => {
    // Cancel any pending auto-advance to prevent race with manual "Next"
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
    // Check session limit
    if (settings.problemsPerSession > 0 && sessionCount >= settings.problemsPerSession) {
      onComplete();
      return;
    }
    setCurrentProblem(generateProblem(topicId, settings.numberRange, settings.allowNegatives));
    setUserAnswer('');
    setFractionNumerator('');
    setFractionDenominator('');
    setAnswerStatus('idle');
    setShowHint(false);
    setSessionCount(prev => prev + 1);
  }, [topicId, sessionCount, settings.problemsPerSession, settings.numberRange, settings.allowNegatives, onComplete]);

  useEffect(() => {
    generateNewProblem();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId]);

  // Start timer when a new problem is shown and status is idle
  useEffect(() => {
    if (answerStatus === 'idle' && currentProblem) {
      startTimer();
    } else {
      stopTimer();
    }
    return stopTimer;
  }, [answerStatus, currentProblem, startTimer, stopTimer]);

  // Clean up auto-advance timeout on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, []);

  // Handle timer expiry (auto-submit as incorrect)
  useEffect(() => {
    if (settings.timerEnabled && timerRemaining === 0 && answerStatus === 'idle' && currentProblem) {
      setAnswerStatus('incorrect');
      setUserProgress(prevProgress => {
        const newProgress = { ...prevProgress, topicProgress: { ...prevProgress.topicProgress } };
        const topicStats = newProgress.topicProgress[topicId]
          ? { ...newProgress.topicProgress[topicId] }
          : { correct: 0, attempted: 0, mastery: false };
        topicStats.attempted += 1;
        newProgress.totalProblemsAttempted = (newProgress.totalProblemsAttempted || 0) + 1;
        newProgress.longestStreak = Math.max(newProgress.longestStreak || 0, newProgress.currentStreak || 0);
        newProgress.currentStreak = 0;
        newProgress.topicProgress[topicId] = topicStats;
        return newProgress;
      });
    }
  }, [timerRemaining, settings.timerEnabled, answerStatus, currentProblem, topicId, setUserProgress]);

  const audioCtxRef = useRef<AudioContext | null>(null);

  // Clean up AudioContext on unmount
  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, []);

  const playSoundEffect = (correct: boolean) => {
    if (!settings.soundEnabled) return;
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.value = 0.1;
      if (correct) {
        osc.frequency.value = 523.25; // C5
        osc.start();
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        osc.stop(ctx.currentTime + 0.2);
      } else {
        osc.frequency.value = 200;
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch {}
  };

  const triggerHaptic = () => {
    if (settings.hapticFeedback && navigator.vibrate) {
      navigator.vibrate(100);
    }
  };

  const handleCheckAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProblem) return;

    let formattedAnswer = '';
    if (currentProblem.answerType === 'fraction') {
      if (!fractionNumerator.trim() || !fractionDenominator.trim()) return;
      formattedAnswer = `${fractionNumerator}/${fractionDenominator}`;
    } else {
      if (!userAnswer.trim()) return;
      formattedAnswer = userAnswer;
    }

    const isCorrect = validateAnswer(currentProblem, formattedAnswer);
    setAnswerStatus(isCorrect ? 'correct' : 'incorrect');

    playSoundEffect(isCorrect);
    if (!isCorrect) {
      triggerHaptic();
      if (settings.showHintsAutomatically && currentProblem.hint) {
        setShowHint(true);
      }
    }

    setUserProgress(prevProgress => {
        const newProgress = {
            ...prevProgress,
            topicProgress: { ...prevProgress.topicProgress }
        };

        const topicStats = newProgress.topicProgress[topicId]
            ? { ...newProgress.topicProgress[topicId] }
            : { correct: 0, attempted: 0, mastery: false };

        topicStats.attempted += 1;
        newProgress.totalProblemsAttempted = (newProgress.totalProblemsAttempted || 0) + 1;

        if (isCorrect) {
            topicStats.correct += 1;
            newProgress.totalCorrect = (newProgress.totalCorrect || 0) + 1;
            newProgress.currentStreak = (newProgress.currentStreak || 0) + 1;
        } else {
            newProgress.currentStreak = 0;
        }

        // Derive mastery from data — re-evaluate every time so threshold changes take effect
        topicStats.mastery = topicStats.correct >= masteryThreshold;

        newProgress.longestStreak = Math.max(newProgress.longestStreak || 0, newProgress.currentStreak);
        newProgress.topicProgress[topicId] = topicStats;

        return newProgress;
    });

    // Auto-advance on correct
    if (isCorrect && settings.autoAdvanceOnCorrect) {
      autoAdvanceRef.current = setTimeout(() => {
        generateNewProblem();
      }, 1200);
    }
  };

  if (!currentProblem) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoaderIcon className="w-12 h-12 animate-spin text-cyan-400" />
      </div>
    );
  }

  const masteryPercent = (topicProgress.correct / masteryThreshold) * 100;

  const fontSizeClasses = {
    small: 'text-2xl sm:text-3xl',
    medium: 'text-4xl sm:text-5xl',
    large: 'text-5xl sm:text-6xl',
  };
  const problemFontSize = fontSizeClasses[settings.fontSize];

  const anim = settings.animationsEnabled;

  return (
    <div className={`bg-slate-800/50 rounded-xl p-6 sm:p-8 shadow-lg border border-slate-700 ${anim ? 'animate-fade-in' : ''}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
           <h2 className="text-2xl sm:text-3xl font-bold text-cyan-400 flex items-center gap-3">
            {topicInfo.title}
            {topicProgress.mastery && (
              <span className="flex items-center gap-2 text-base font-semibold text-green-400 bg-green-500/10 px-3 py-1 rounded-full">
                <TrophyIcon className="w-4 h-4" />
                Mastered
              </span>
            )}
           </h2>
           <p className="text-slate-400 text-sm mt-1">{topicInfo.description}</p>
        </div>
        <button onClick={onComplete} className="flex items-center text-sm text-cyan-400 hover:text-cyan-300 transition-colors shrink-0 ml-4">
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Back
        </button>
      </div>

       <div className="my-6">
          <ProgressBar percentage={masteryPercent} />
          <div className="flex justify-between items-center mt-1">
            {settings.problemsPerSession > 0 && (
              <p className="text-sm text-slate-400">Problem {Math.min(sessionCount, settings.problemsPerSession)} / {settings.problemsPerSession}</p>
            )}
            <p className="text-right text-sm text-slate-300 ml-auto">{topicProgress.correct} / {masteryThreshold} Correct</p>
          </div>
        </div>

      {/* Timer display */}
      {settings.timerEnabled && answerStatus === 'idle' && (
        <div className={`flex items-center justify-center gap-2 mb-4 text-lg font-mono ${timerRemaining <= 10 ? 'text-red-400' : 'text-slate-300'}`}>
          <TimerIcon className="w-5 h-5" />
          <span>{timerRemaining}s</span>
        </div>
      )}

      <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/30 rounded-lg p-8 text-center my-8 min-h-[120px] flex items-center justify-center">
        <p className={`${problemFontSize} font-mono tracking-wider whitespace-pre-line`}>{currentProblem.problemText}</p>
      </div>

      <form onSubmit={handleCheckAnswer}>
        {currentProblem.answerType === 'fraction' ? (
          <div className="flex flex-col items-center gap-2">
            <input
              type="number"
              value={fractionNumerator}
              onChange={(e) => setFractionNumerator(e.target.value)}
              disabled={answerStatus !== 'idle'}
              placeholder="Numerator"
              autoFocus
              className={`w-48 text-xl p-3 bg-slate-700 border-2 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all disabled:opacity-50
                ${answerStatus === 'incorrect' ? 'border-red-500' : 'border-slate-600'}
              `}
            />
            <div className="w-48 h-0.5 bg-slate-400"></div>
            <input
              type="number"
              value={fractionDenominator}
              onChange={(e) => setFractionDenominator(e.target.value)}
              disabled={answerStatus !== 'idle'}
              placeholder="Denominator"
              className={`w-48 text-xl p-3 bg-slate-700 border-2 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all disabled:opacity-50
                ${answerStatus === 'incorrect' ? `border-red-500 ${anim ? 'animate-shake' : ''}` : 'border-slate-600'}
              `}
            />
          </div>
        ) : (
          <input
            type={currentProblem.answerType === 'numeric' || currentProblem.answerType === 'decimal-tolerance' ? 'number' : 'text'}
            step="any"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            disabled={answerStatus !== 'idle'}
            placeholder="Your answer..."
            autoFocus
            className={`w-full text-xl p-4 bg-slate-700 border-2 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all disabled:opacity-50
              ${answerStatus === 'incorrect' ? `border-red-500 ${anim ? 'animate-shake' : ''}` : 'border-slate-600'}
            `}
          />
        )}

        <div className="flex gap-2 mt-4">
          {answerStatus === 'idle' ? (
            <>
              <button
                type="submit"
                disabled={
                  currentProblem.answerType === 'fraction'
                    ? !fractionNumerator.trim() || !fractionDenominator.trim()
                    : !userAnswer.trim()
                }
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-4 rounded-lg text-lg transition-transform transform hover:scale-105 disabled:bg-slate-600 disabled:cursor-not-allowed disabled:transform-none"
              >
                Check Answer
              </button>
              {currentProblem.hint && (
                <button
                  type="button"
                  onClick={() => setShowHint(!showHint)}
                  className="px-4 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition-transform transform hover:scale-105"
                  title="Show hint"
                >
                  <LightbulbIcon className="w-5 h-5" />
                </button>
              )}
            </>
          ) : (
            !(settings.autoAdvanceOnCorrect && answerStatus === 'correct') && (
              <button type="button" onClick={generateNewProblem} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-lg text-lg transition-transform transform hover:scale-105">
                Next Question
              </button>
            )
          )}
        </div>
      </form>

      {/* Show hint */}
      {showHint && currentProblem.hint && (
        <div className={`mt-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 ${anim ? 'animate-fade-in-up' : ''}`}>
          <p className="text-amber-300 text-sm flex items-center">
            <LightbulbIcon className="w-4 h-4 mr-2 inline" />
            <strong>Hint:</strong> <span className="ml-2">{currentProblem.hint}</span>
          </p>
        </div>
      )}

      {answerStatus !== 'idle' && (
        <div className={`mt-6 p-4 rounded-lg text-center
          ${answerStatus === 'correct' ? `bg-green-500/20 text-green-300 ${anim ? 'animate-pop' : ''}` : `bg-red-500/20 text-red-300 ${anim ? 'animate-fade-in-up' : ''}`}`}
        >
          <p className="font-bold text-lg">
            {answerStatus === 'correct' ? 'Correct!' : timerRemaining === 0 && settings.timerEnabled ? "Time's up!" : 'Not quite.'}
          </p>
          {answerStatus === 'incorrect' && (
            <p>The correct answer is: <span className="font-bold">{formatAnswer(currentProblem.correctAnswer)}</span></p>
          )}
          {answerStatus === 'incorrect' && settings.showExplanationOnIncorrect && currentProblem.explanationPrompt && (
            <p className="mt-2 text-sm text-slate-300 italic">{currentProblem.explanationPrompt}</p>
          )}
          {answerStatus === 'correct' && settings.autoAdvanceOnCorrect && (
            <p className="mt-1 text-sm text-green-400/60">Next question in a moment...</p>
          )}
        </div>
      )}

    </div>
  );
}