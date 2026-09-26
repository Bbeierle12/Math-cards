import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AttemptEvent, LearningLog, SkillState, TopicId, UserProgress } from '../types';
import useLocalStorage from './useLocalStorage';
import { sanitizeProgress } from '../services/storageValidation';
import { GENERATORS } from '../services/generators';
import {
  appendEvent, deriveSkills, deriveTotals, dueReviews, emptyLog, migrateLegacy, rulesFor, sanitizeLog, skillStatus,
} from '../services/learning';
import type { DueReview, MasteryRules, SkillStatus, Totals } from '../services/learning';

export const LOG_KEY = 'learningLog';
/** The counter-based progress of earlier versions. Read once for migration, never written. */
export const LEGACY_KEY = 'userProgress';

const EMPTY_PROGRESS: UserProgress = { topicProgress: {}, totalProblemsAttempted: 0, totalCorrect: 0, currentStreak: 0, longestStreak: 0 };

export const templateCount = (skill: TopicId): number => GENERATORS.get(skill)?.templates.length ?? 1;

/** The log to start from when none is stored: migrated legacy progress, or an empty log. */
const initialLog = (threshold: number): LearningLog => {
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (raw) {
      const progress = sanitizeProgress(JSON.parse(raw), EMPTY_PROGRESS);
      if (progress.totalProblemsAttempted > 0 || Object.keys(progress.topicProgress).length > 0) {
        return migrateLegacy(progress, Date.now(), rulesFor(threshold));
      }
    }
  } catch {
    /* unreadable legacy data: start fresh (the legacy key itself is left alone) */
  }
  return emptyLog();
};

export interface Learning {
  log: LearningLog;
  rules: MasteryRules;
  skills: Partial<Record<TopicId, SkillState>>;
  totals: Totals;
  /** Reviews due now, most overdue first. */
  due: DueReview[];
  status: (skill: TopicId) => SkillStatus;
  record: (event: AttemptEvent) => void;
  reset: () => void;
  now: number;
}

/** The persisted learning record and everything derived from it. */
export default function useLearning(threshold: number): Learning {
  const [initial] = useState(() => initialLog(threshold));
  const [log, setLog] = useLocalStorage<LearningLog>(LOG_KEY, initial, raw => sanitizeLog(raw) ?? initial);

  // Persist the migrated (or empty) log right away, so the migration runs once.
  useEffect(() => {
    try {
      if (window.localStorage.getItem(LOG_KEY) === null) setLog(initial);
    } catch { /* storage unavailable: keep working in memory */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "Due" depends on the clock: re-evaluate every minute.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const rules = useMemo(() => rulesFor(threshold), [threshold]);
  const skills = useMemo(() => deriveSkills(log, rules, templateCount), [log, rules]);
  const totals = useMemo(() => deriveTotals(log), [log]);
  const due = useMemo(() => dueReviews(skills, now), [skills, now]);
  const status = useCallback((skill: TopicId) => skillStatus(skills[skill], rules, templateCount(skill)), [skills, rules]);

  const record = useCallback((event: AttemptEvent) => {
    setLog(prev => appendEvent(prev, event, rules, templateCount));
    setNow(Date.now());
  }, [rules, setLog]);

  const reset = useCallback(() => {
    setLog({ ...emptyLog(), migratedAt: Date.now() });
    try { window.localStorage.removeItem(LEGACY_KEY); } catch { /* ignore */ }
  }, [setLog]);

  return { log, rules, skills, totals, due, status, record, reset, now };
}
