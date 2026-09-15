/**
 * Shape validation for values read back from localStorage. JSON.parse only
 * guarantees syntactically valid JSON; a stored `5`, `null`, `"dark"` or a
 * partially-shaped object must never reach rendering code.
 */
import { UserSettings, UserProgress, TopicProgress, TopicId } from '../types';

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const SETTING_ENUMS: { [K in keyof UserSettings]?: readonly string[] } = {
  practiceMode: ['standard', 'speed-drill', 'thoughtful'],
  unlockMode: ['sequential', 'free'],
  theme: ['dark', 'light', 'system'],
  fontSize: ['small', 'medium', 'large'],
};

/**
 * Keep only the stored settings whose value has the right type (and, for
 * enumerations, an allowed value). Anything else falls back to the default.
 */
export const sanitizeSettings = (raw: unknown, defaults: UserSettings): UserSettings => {
  const merged: UserSettings = { ...defaults, numberRange: { ...defaults.numberRange } };
  const out = merged as unknown as Record<string, unknown>;
  if (!isPlainObject(raw)) return merged;

  for (const key of Object.keys(defaults) as (keyof UserSettings)[]) {
    const value = raw[key];
    if (value === undefined || value === null) continue;
    const allowed = SETTING_ENUMS[key];
    if (allowed) {
      if (typeof value === 'string' && allowed.includes(value)) out[key] = value;
      continue;
    }
    if (key === 'numberRange') {
      if (isPlainObject(value)) {
        const min = isFiniteNumber(value.min) ? Math.trunc(value.min) : defaults.numberRange.min;
        const max = isFiniteNumber(value.max) ? Math.trunc(value.max) : defaults.numberRange.max;
        merged.numberRange = min <= max ? { min, max } : { min: max, max: min };
      }
      continue;
    }
    const defaultValue = defaults[key];
    if (typeof defaultValue === 'number') {
      if (isFiniteNumber(value)) out[key] = value;
    } else if (typeof defaultValue === 'boolean') {
      if (typeof value === 'boolean') out[key] = value;
    }
  }
  // Cross-field constraints the UI also enforces.
  if (merged.masteryThreshold < 1) merged.masteryThreshold = defaults.masteryThreshold;
  if (merged.timerDurationSeconds < 1) merged.timerDurationSeconds = defaults.timerDurationSeconds;
  if (merged.problemsPerSession < 0) merged.problemsPerSession = defaults.problemsPerSession;
  return merged;
};

const nonNegativeInt = (v: unknown, fallback: number): number =>
  isFiniteNumber(v) && v >= 0 ? Math.trunc(v) : fallback;

const sanitizeTopicProgress = (raw: unknown): TopicProgress | null => {
  if (!isPlainObject(raw)) return null;
  const correct = nonNegativeInt(raw.correct, 0);
  const attempted = Math.max(correct, nonNegativeInt(raw.attempted, 0));
  return { correct, attempted, mastery: raw.mastery === true };
};

/** Rebuild a well-formed UserProgress from whatever was stored. */
export const sanitizeProgress = (raw: unknown, defaults: UserProgress): UserProgress => {
  const result: UserProgress = {
    topicProgress: {},
    totalProblemsAttempted: defaults.totalProblemsAttempted,
    totalCorrect: defaults.totalCorrect,
    currentStreak: defaults.currentStreak,
    longestStreak: defaults.longestStreak,
  };
  if (!isPlainObject(raw)) return result;

  if (isPlainObject(raw.topicProgress)) {
    for (const [topicId, value] of Object.entries(raw.topicProgress)) {
      const tp = sanitizeTopicProgress(value);
      if (tp) result.topicProgress[topicId as TopicId] = tp;
    }
  }
  result.totalProblemsAttempted = nonNegativeInt(raw.totalProblemsAttempted, 0);
  result.totalCorrect = Math.min(nonNegativeInt(raw.totalCorrect, 0), result.totalProblemsAttempted);
  result.currentStreak = nonNegativeInt(raw.currentStreak, 0);
  result.longestStreak = Math.max(result.currentStreak, nonNegativeInt(raw.longestStreak, 0));
  return result;
};
