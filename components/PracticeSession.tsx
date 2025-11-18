
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TopicId, Problem, UserProgress } from '../types';
import { generateProblem, validateAnswer } from '../services/mathService';
import { getExplanation } from '../services/geminiService';
import { CURRICULUM, MASTERY_THRESHOLD } from '../constants';
import ProgressBar from './ProgressBar';
import { ArrowLeftIcon, LightbulbIcon, LoaderIcon, TrophyIcon } from './Icons';

interface PracticeSessionProps {
  topicId: TopicId;
  onComplete: () => void;
  userProgress: UserProgress;
  setUserProgress: (value: UserProgress | ((prev: UserProgress) => UserProgress)) => void;
}

export default function PracticeSession({ topicId, onComplete, userProgress, setUserProgress }: PracticeSessionProps) {
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [answerStatus, setAnswerStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [explanation, setExplanation] = useState<string>('');
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);

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

  const generateNewProblem = useCallback(() => {
    setCurrentProblem(generateProblem(topicId));
    setUserAnswer('');
    setAnswerStatus('idle');
    setExplanation('');
  }, [topicId]);

  useEffect(() => {
    generateNewProblem();
  }, [generateNewProblem]);

  const handleCheckAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProblem || userAnswer.trim() === '') return;

    const isCorrect = validateAnswer(currentProblem, userAnswer);
    setAnswerStatus(isCorrect ? 'correct' : 'incorrect');

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
        
        if (topicStats.correct >= MASTERY_THRESHOLD) {
            topicStats.mastery = true;
        }
        
        newProgress.longestStreak = Math.max(newProgress.longestStreak || 0, newProgress.currentStreak);
        newProgress.topicProgress[topicId] = topicStats;

        return newProgress;
    });

    if (!isCorrect) {
      setIsLoadingExplanation(true);
      try {
        const expl = await getExplanation(currentProblem);
        setExplanation(expl);
      } catch (error) {
        console.error("Failed to get explanation:", error);
        setExplanation("Sorry, couldn't fetch an explanation. Please try again.");
      } finally {
        setIsLoadingExplanation(false);
      }
    }
  };

  if (!currentProblem) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoaderIcon className="w-12 h-12 animate-spin text-cyan-400" />
      </div>
    );
  }

  const masteryPercent = (topicProgress.correct / MASTERY_THRESHOLD) * 100;

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 sm:p-8 shadow-lg border border-slate-700 animate-fade-in">
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
          <p className="text-right text-sm text-slate-300 mt-1">{topicProgress.correct} / {MASTERY_THRESHOLD} Correct</p>
        </div>

      <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/30 rounded-lg p-8 text-center my-8 min-h-[120px] flex items-center justify-center">
        <p className="text-4xl sm:text-5xl font-mono tracking-wider">{currentProblem.problemText}</p>
      </div>

      <form onSubmit={handleCheckAnswer}>
        <input
          type="number"
          step="any"
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          disabled={answerStatus !== 'idle'}
          placeholder="Your answer..."
          autoFocus
          className={`w-full text-xl p-4 bg-slate-700 border-2 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all disabled:opacity-50
            ${answerStatus === 'incorrect' ? 'border-red-500 animate-shake' : 'border-slate-600'}
          `}
        />
        {answerStatus === 'idle' ? (
          <button type="submit" disabled={!userAnswer.trim()} className="w-full mt-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-4 rounded-lg text-lg transition-transform transform hover:scale-105 disabled:bg-slate-600 disabled:cursor-not-allowed disabled:transform-none">
            Check Answer
          </button>
        ) : (
          <button type="button" onClick={generateNewProblem} className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-lg text-lg transition-transform transform hover:scale-105">
            Next Question
          </button>
        )}
      </form>
      
      {answerStatus !== 'idle' && (
        <div className={`mt-6 p-4 rounded-lg text-center 
          ${answerStatus === 'correct' ? 'bg-green-500/20 text-green-300 animate-pop' : 'bg-red-500/20 text-red-300 animate-fade-in-up'}`}
        >
          <p className="font-bold text-lg">{answerStatus === 'correct' ? 'Correct!' : 'Not quite.'}</p>
           {answerStatus === 'incorrect' && <p>The correct answer is: <span className="font-bold">{currentProblem.correctAnswer}</span></p>}
        </div>
      )}

      {explanation && (
        <div className="mt-6 p-4 rounded-lg bg-slate-700/70 border border-slate-600 animate-fade-in-up">
            <h3 className="font-bold text-lg text-amber-300 flex items-center mb-2"><LightbulbIcon className="w-5 h-5 mr-2"/> Explanation</h3>
            <div className="prose prose-invert prose-sm text-slate-300" dangerouslySetInnerHTML={{__html: explanation}}></div>
        </div>
      )}
      {isLoadingExplanation && (
        <div className="mt-6 flex justify-center items-center p-4 animate-fade-in-up">
             <LoaderIcon className="w-8 h-8 animate-spin text-amber-300" />
             <p className="ml-3 text-amber-300">Generating explanation...</p>
        </div>
      )}

    </div>
  );
}