import { describe, it, expect } from 'vitest';
import { sanitizeSettings, sanitizeProgress } from './storageValidation';
import { DEFAULT_SETTINGS } from '../constants';
import { UserProgress } from '../types';

const DEFAULT_PROGRESS: UserProgress = {
  topicProgress: {}, totalProblemsAttempted: 0, totalCorrect: 0, currentStreak: 0, longestStreak: 0,
};

describe('sanitizeSettings', () => {
  it('returns defaults for valid JSON of the wrong shape', () => {
    for (const raw of [5, null, 'dark', true, [1, 2], undefined]) {
      expect(sanitizeSettings(raw, DEFAULT_SETTINGS)).toEqual(DEFAULT_SETTINGS);
    }
  });

  it('keeps well-typed stored values and drops mistyped ones', () => {
    const out = sanitizeSettings({
      masteryThreshold: 7, theme: 'light', practiceMode: 'nonsense', timerEnabled: 'yes', soundEnabled: true,
      numberRange: { min: 20, max: 5 }, fontSize: 'large', extra: 1,
    }, DEFAULT_SETTINGS);
    expect(out.masteryThreshold).toBe(7);
    expect(out.theme).toBe('light');
    expect(out.practiceMode).toBe(DEFAULT_SETTINGS.practiceMode);
    expect(out.timerEnabled).toBe(DEFAULT_SETTINGS.timerEnabled);
    expect(out.soundEnabled).toBe(true);
    expect(out.numberRange).toEqual({ min: 5, max: 20 }); // inverted range repaired
    expect(out.fontSize).toBe('large');
    expect('extra' in out).toBe(false);
  });

  it('repairs a malformed numberRange', () => {
    expect(sanitizeSettings({ numberRange: 'wide' }, DEFAULT_SETTINGS).numberRange).toEqual(DEFAULT_SETTINGS.numberRange);
    expect(sanitizeSettings({ numberRange: { min: 'a', max: 3 } }, DEFAULT_SETTINGS).numberRange).toEqual({ min: DEFAULT_SETTINGS.numberRange.min, max: 3 });
  });
});

describe('sanitizeProgress', () => {
  it('returns defaults for valid JSON of the wrong shape', () => {
    for (const raw of [5, null, 'x', [], { topicProgress: 3 }]) {
      const out = sanitizeProgress(raw, DEFAULT_PROGRESS);
      expect(out.topicProgress).toEqual({});
      expect(out.totalProblemsAttempted).toBe(0);
    }
  });

  it('keeps valid topic entries and drops malformed ones', () => {
    const out = sanitizeProgress({
      topicProgress: { addition: { correct: 4, attempted: 6, mastery: false }, subtraction: 'bad', division: { correct: 9, attempted: 2 } },
      totalProblemsAttempted: 8, totalCorrect: 13, currentStreak: 2, longestStreak: 1,
    }, DEFAULT_PROGRESS);
    expect(out.topicProgress.addition).toEqual({ correct: 4, attempted: 6, mastery: false });
    expect(out.topicProgress.subtraction).toBeUndefined();
    expect(out.topicProgress.division).toEqual({ correct: 9, attempted: 9, mastery: false }); // attempted >= correct
    expect(out.totalCorrect).toBe(8); // cannot exceed attempted
    expect(out.longestStreak).toBe(2); // cannot be below the current streak
  });
});
