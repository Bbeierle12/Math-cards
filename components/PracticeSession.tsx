
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { TopicId, Problem, UserProgress } from '../types';
import { answerDisplay, generateProblem, validateAnswer } from '../services/mathService';
import { CURRICULUM } from '../constants';
import ProgressBar from './ProgressBar';
import { ArrowLeftIcon, LightbulbIcon, LoaderIcon, TrophyIcon, TimerIcon } from './Icons';
import { useSettings } from '../contexts/SettingsContext';
import MathText from './MathText';
import { isTopicMastered } from '../services/mastery';
import AnswerInput, { emptyValues, toSubmission } from './AnswerInput';

interface PracticeSessionProps {
  topicId: TopicId;
  onComplete: () => void;
  userProgress: UserProgress;
  setUserProgress: (value: UserProgress | ((prev: UserProgress) => UserProgress)) => void;
}

export default function PracticeSession({ topicId, onComplete, userProgress, setUserProgress }: PracticeSessionProps) {
  const { settings } = useSettings();
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  // One string per input slot of the current problem (see AnswerInput).
  const [answerValues, setAnswerValues] = useState<string[]>(['']);
  const [answerStatus, setAnswerStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [showHint, setShowHint] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [timerRemaining, setTimerRemaining] = useState(settings.timerDurationSeconds);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // True only when the countdown for the CURRENT problem actually reached zero.
  const timedOutRef = useRef(false);

  const masteryThreshold = settings.masteryThreshold;

  const topicProgress = useMemo(() => {
    return userProgress.topicProgress[topicId] || { correct: 0, attempted: 0, mastery: false };
  }, [userProgress, topicId]);
  // Same definition as unlocking/badges: derived from the current threshold.
  const isMastered = isTopicMastered(topicProgress, masteryThreshold);

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
          timedOutRef.current = true;
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
    const next = generateProblem(topicId, { numberRange: settings.numberRange, allowNegatives: settings.allowNegatives });
    setCurrentProblem(next);
    setAnswerValues(emptyValues(next));
    setAnswerStatus('idle');
    setShowHint(false);
    setSessionCount(prev => prev + 1);
    // Reset the countdown in the SAME batch as the status change. Otherwise the
    // expiry effect below would observe {timerRemaining: 0, status: 'idle'} for
    // the fresh problem and fail it before the timer restarts.
    setTimerRemaining(settings.timerDurationSeconds);
    timedOutRef.current = false;
  }, [topicId, sessionCount, settings.problemsPerSession, settings.numberRange, settings.allowNegatives, settings.timerDurationSeconds, onComplete]);

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

  // Handle timer expiry (auto-submit as incorrect). Guarded by timedOutRef so a
  // stale zero from the previous problem can never score the new one.
  useEffect(() => {
    if (settings.timerEnabled && timerRemaining === 0 && timedOutRef.current && answerStatus === 'idle' && currentProblem) {
      timedOutRef.current = false;
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

    const submission = toSubmission(currentProblem, answerValues);
    if (submission === null) return;

    const isCorrect = validateAnswer(currentProblem, submission);
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
            {isMastered && (
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
        <div className={`${problemFontSize} font-mono tracking-wider`}>
          <MathText text={currentProblem.problemText} />
        </div>
      </div>

      <form onSubmit={handleCheckAnswer}>
        <AnswerInput
          problem={currentProblem}
          values={answerValues}
          onChange={setAnswerValues}
          disabled={answerStatus !== 'idle'}
          status={answerStatus}
          animate={anim}
        />

        <div className="flex gap-2 mt-4">
          {answerStatus === 'idle' ? (
            <>
              <button
                type="submit"
                disabled={toSubmission(currentProblem, answerValues) === null}
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
            <strong>Hint:</strong> <span className="ml-2"><MathText text={currentProblem.hint!} /></span>
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
            <p>The correct answer is: <span className="font-bold"><MathText text={answerDisplay(currentProblem)} /></span></p>
          )}
          {answerStatus === 'incorrect' && settings.showExplanationOnIncorrect && currentProblem.explanation && (
            <p className="mt-2 text-sm text-slate-300"><MathText text={currentProblem.explanation} /></p>
          )}
          {answerStatus === 'correct' && settings.autoAdvanceOnCorrect && (
            <p className="mt-1 text-sm text-green-400/60">Next question in a moment...</p>
          )}
        </div>
      )}

      {/* Replayable reference: generateProblem(generatorId, settings, seed) reproduces this exact problem. */}
      <p className="mt-6 text-center text-xs text-slate-500">
        Problem <span className="font-mono select-all" title="Quote this when reporting a problem">
          {currentProblem.id}{currentProblem.settings ? ` ${JSON.stringify(currentProblem.settings)}` : ''}
        </span>
      </p>

    </div>
  );
}