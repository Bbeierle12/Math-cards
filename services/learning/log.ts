/**
 * The persisted learning log: attempt events over a baseline. Everything the
 * UI shows (skill states, totals, streaks) is derived from it.
 *
 *  - Migration: an existing pre-log `userProgress` becomes the baseline
 *    (per-topic counters as legacy evidence, totals and streaks as-is). The
 *    old key is never modified, so reverting the app restores it exactly.
 *  - Compaction: past MAX_EVENTS the oldest events are folded into the
 *    baseline, keeping localStorage bounded.
 */
import type { AttemptEvent, LearningLog, SkillState, TopicId, UserProgress } from '../../types';
import { applyEvent, emptySkill, foldSkills, MAX_INSTANCES } from './mastery';
import type { MasteryRules } from './mastery';
import { DAY, firstInterval } from './schedule';

export const MAX_EVENTS = 5000;
export const KEEP_EVENTS = 4000;

export const emptyLog = (): LearningLog => ({
  version: 1,
  baseline: { skills: {}, attempted: 0, correct: 0, currentStreak: 0, longestStreak: 0 },
  events: [],
});

/** The baseline for a user of the counter-based progress format. */
export const migrateLegacy = (progress: UserProgress, now: number, rules: MasteryRules): LearningLog => {
  const log = emptyLog();
  for (const [id, tp] of Object.entries(progress.topicProgress)) {
    if (!tp || tp.attempted === 0) continue;
    const proficient = tp.correct >= rules.threshold;
    log.baseline.skills[id as TopicId] = {
      ...emptySkill(),
      evidence: tp.correct,
      correct: tp.correct,
      attempted: tp.attempted,
      legacy: true,
      proficientAt: proficient ? now : null,
      stability: proficient ? firstInterval() : 0,
      dueAt: proficient ? now + firstInterval() * DAY : null,
    };
  }
  log.baseline.attempted = progress.totalProblemsAttempted;
  log.baseline.correct = progress.totalCorrect;
  log.baseline.currentStreak = progress.currentStreak;
  log.baseline.longestStreak = progress.longestStreak;
  log.migratedAt = now;
  return log;
};

export interface Totals { attempted: number; correct: number; currentStreak: number; longestStreak: number }

export const deriveTotals = (log: LearningLog): Totals => {
  let { attempted, correct, currentStreak, longestStreak } = log.baseline;
  for (const e of log.events) {
    attempted += 1;
    if (e.correct) {
      correct += 1;
      currentStreak += 1;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }
  return { attempted, correct, currentStreak, longestStreak };
};

/** Append an event, compacting when the log grows past MAX_EVENTS. */
export const appendEvent = (log: LearningLog, e: AttemptEvent, rules: MasteryRules, templateCount: (s: TopicId) => number): LearningLog => {
  const events = [...log.events, e];
  if (events.length <= MAX_EVENTS) return { ...log, events };
  const old = events.slice(0, events.length - KEEP_EVENTS);
  const folded: LearningLog = { ...log, events: old };
  const totals = deriveTotals(folded);
  return {
    ...log,
    baseline: {
      skills: foldSkills(log.baseline.skills, old, rules, templateCount),
      ...totals,
    },
    events: events.slice(events.length - KEEP_EVENTS),
  };
};

export const deriveSkills = (log: LearningLog, rules: MasteryRules, templateCount: (s: TopicId) => number) =>
  foldSkills(log.baseline.skills, log.events, rules, templateCount);

// ---------------------------------------------------------------------------
// Validation of what localStorage returns
// ---------------------------------------------------------------------------

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const nonNeg = (v: unknown, fallback = 0): number => (isNum(v) && v >= 0 ? v : fallback);
const nullableTime = (v: unknown): number | null => (isNum(v) && v >= 0 ? v : null);

const sanitizeEvent = (raw: unknown): AttemptEvent | null => {
  if (!isObject(raw)) return null;
  const { t, skillId, generatorVersion, templateId, seed, instance, correct, firstAttempt, hintUsed } = raw;
  if (!isNum(t) || typeof skillId !== 'string' || typeof templateId !== 'string' || typeof seed !== 'string'
    || typeof instance !== 'string' || typeof correct !== 'boolean') return null;
  const e: AttemptEvent = {
    t, skillId: skillId as TopicId, generatorVersion: isNum(generatorVersion) ? generatorVersion : 0, templateId, seed, instance, correct,
    firstAttempt: firstAttempt !== false, hintUsed: hintUsed === true,
  };
  if (raw.timedOut === true) e.timedOut = true;
  if (isNum(raw.responseMs) && raw.responseMs >= 0) e.responseMs = raw.responseMs;
  return e;
};

const sanitizeSkill = (raw: unknown): SkillState | null => {
  if (!isObject(raw)) return null;
  const templates: Record<string, number> = {};
  if (isObject(raw.templates)) {
    for (const [k, v] of Object.entries(raw.templates)) if (isNum(v) && v >= 0) templates[k] = Math.trunc(v);
  }
  const correct = Math.trunc(nonNeg(raw.correct));
  const proficientAt = nullableTime(raw.proficientAt);
  return {
    evidence: nonNeg(raw.evidence),
    correct,
    attempted: Math.max(correct, Math.trunc(nonNeg(raw.attempted))),
    templates,
    instances: Array.isArray(raw.instances) ? raw.instances.filter((x): x is string => typeof x === 'string').slice(-MAX_INSTANCES) : [],
    legacy: raw.legacy === true,
    proficientAt,
    mastered: proficientAt !== null && raw.mastered === true,
    stability: proficientAt !== null ? nonNeg(raw.stability) : 0,
    dueAt: proficientAt !== null ? nullableTime(raw.dueAt) : null,
    lastReviewAt: nullableTime(raw.lastReviewAt),
    lapses: Math.trunc(nonNeg(raw.lapses)),
  };
};

/** A well-formed LearningLog from whatever was stored, or null when it is not a log at all. */
export const sanitizeLog = (raw: unknown): LearningLog | null => {
  if (!isObject(raw) || raw.version !== 1) return null;
  const log = emptyLog();
  const b = isObject(raw.baseline) ? raw.baseline : {};
  if (isObject(b.skills)) {
    for (const [id, v] of Object.entries(b.skills)) {
      const skill = sanitizeSkill(v);
      if (skill) log.baseline.skills[id as TopicId] = skill;
    }
  }
  log.baseline.attempted = Math.trunc(nonNeg(b.attempted));
  log.baseline.correct = Math.min(log.baseline.attempted, Math.trunc(nonNeg(b.correct)));
  log.baseline.currentStreak = Math.trunc(nonNeg(b.currentStreak));
  log.baseline.longestStreak = Math.max(log.baseline.currentStreak, Math.trunc(nonNeg(b.longestStreak)));
  if (Array.isArray(raw.events)) {
    const events = raw.events.map(sanitizeEvent).filter((e): e is AttemptEvent => e !== null);
    events.sort((x, y) => x.t - y.t);
    log.events = events.slice(-MAX_EVENTS);
  }
  if (isNum(raw.migratedAt)) log.migratedAt = raw.migratedAt;
  return log;
};

export { applyEvent };
