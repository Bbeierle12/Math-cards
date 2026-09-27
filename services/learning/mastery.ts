/**
 * Evidence-based proficiency and mastery (docs/PLAN.md, Phase 3).
 *
 * A skill's state is a pure fold of its attempt events over a baseline, so
 * every counter and status is derived and a change of rules (for example the
 * evidence threshold in settings) applies to the whole history at once.
 *
 *  - Evidence: a correct first attempt on a new problem counts 1; a correct
 *    second attempt 0.25; a hint halves the weight; an exact repeat of a
 *    problem already seen counts a quarter (so no topic can be passed by
 *    repeating a fixed item); an error subtracts `errorPenalty` (guessing
 *    does not accumulate). Evidence never goes below 0.
 *  - Proficient: evidence ≥ threshold, and correct answers span at least
 *    min(minTemplates, templates available) structural templates.
 *  - Mastered: proficient, and a scheduled review taken at least
 *    `reviewDelayDays` after proficiency was reached was passed on the first
 *    attempt. A failed review makes the skill proficient-but-not-mastered
 *    again; losing proficiency (errors) clears mastery and the schedule.
 */
import type { AttemptEvent, SkillState, TopicId } from '../../types';
import { firstInterval, nextInterval, lapseInterval, DAY } from './schedule';

export interface MasteryRules {
  /** Evidence needed for proficiency (the "Mastery Threshold" setting). */
  threshold: number;
  minTemplates: number;
  reviewDelayDays: number;
  errorPenalty: number;
}

export const DEFAULT_RULES: Omit<MasteryRules, 'threshold'> = {
  minTemplates: 3,
  reviewDelayDays: 3,
  errorPenalty: 0.5,
};

export const rulesFor = (threshold: number): MasteryRules => ({ ...DEFAULT_RULES, threshold });

/** Instances remembered per skill for repeat detection. */
export const MAX_INSTANCES = 400;

export const emptySkill = (): SkillState => ({
  evidence: 0,
  correct: 0,
  attempted: 0,
  templates: {},
  instances: [],
  legacy: false,
  proficientAt: null,
  mastered: false,
  stability: 0,
  dueAt: null,
  lastReviewAt: null,
  lapses: 0,
});

/** Evidence contributed by one event, given the state before it. */
export const evidenceWeight = (state: SkillState, e: AttemptEvent, rules: MasteryRules): number => {
  if (!e.correct) return -rules.errorPenalty;
  let w = e.firstAttempt ? 1 : 0.25;
  if (e.hintUsed) w *= 0.5;
  if (state.instances.includes(e.instance)) w *= 0.25;
  return w;
};

const templatesCovered = (state: SkillState): number =>
  Object.values(state.templates).filter(count => count > 0).length;

/** Templates proficiency must span, for a generator offering `templateCount`. */
export const templatesRequired = (rules: MasteryRules, templateCount: number): number =>
  Math.max(1, Math.min(rules.minTemplates, templateCount));

export const meetsProficiency = (state: SkillState, rules: MasteryRules, templateCount: number): boolean =>
  state.evidence >= rules.threshold - 1e-9
  && (state.legacy || templatesCovered(state) >= templatesRequired(rules, templateCount));

/** Apply one event. Pure: returns a new state. */
export const applyEvent = (before: SkillState, e: AttemptEvent, rules: MasteryRules, templateCount: number): SkillState => {
  const s: SkillState = {
    ...before,
    templates: { ...before.templates },
    instances: before.instances.includes(e.instance) ? before.instances : [...before.instances, e.instance].slice(-MAX_INSTANCES),
  };
  s.attempted += 1;
  if (e.correct) {
    s.correct += 1;
    s.templates[e.templateId] = (s.templates[e.templateId] ?? 0) + 1;
  }
  s.evidence = Math.max(0, before.evidence + evidenceWeight(before, e, rules));

  const wasProficient = before.proficientAt !== null;
  // A review is an attempt on a proficient skill once its review is due.
  if (wasProficient && before.dueAt !== null && e.t >= before.dueAt) {
    const since = before.lastReviewAt ?? before.proficientAt!;
    const elapsedDays = (e.t - since) / DAY;
    if (e.correct && e.firstAttempt && !e.hintUsed) {
      s.stability = nextInterval(before.stability, elapsedDays);
      if (e.t - before.proficientAt! >= rules.reviewDelayDays * DAY) s.mastered = true;
    } else {
      s.stability = lapseInterval(before.stability);
      s.lapses += 1;
      s.mastered = false;
    }
    s.lastReviewAt = e.t;
    s.dueAt = e.t + s.stability * DAY;
  }

  const nowProficient = meetsProficiency(s, rules, templateCount);
  if (!wasProficient && nowProficient) {
    s.proficientAt = e.t;
    s.stability = firstInterval();
    s.dueAt = e.t + s.stability * DAY;
    s.lastReviewAt = null;
  } else if (wasProficient && !nowProficient) {
    s.proficientAt = null;
    s.mastered = false;
    s.stability = 0;
    s.dueAt = null;
    s.lastReviewAt = null;
  }
  return s;
};

export type SkillStatus = 'new' | 'learning' | 'proficient' | 'mastered';

export const skillStatus = (state: SkillState | undefined, rules: MasteryRules, templateCount: number): SkillStatus => {
  if (!state || (state.attempted === 0 && state.evidence === 0)) return 'new';
  if (!meetsProficiency(state, rules, templateCount)) return 'learning';
  return state.mastered ? 'mastered' : 'proficient';
};

export interface SkillProgress {
  status: SkillStatus;
  /** Evidence as a fraction of the threshold, capped at 1. */
  evidenceFraction: number;
  evidence: number;
  templatesCovered: number;
  /** 0 when the requirement is waived (progress migrated from the counter format has no template record). */
  templatesRequired: number;
  dueAt: number | null;
  /** What is still missing, in words, for the UI. */
  next: string;
}

const round1 = (x: number) => Math.round(x * 10) / 10;

export const describeSkill = (state: SkillState | undefined, rules: MasteryRules, templateCount: number, now: number): SkillProgress => {
  const s = state ?? emptySkill();
  const status = skillStatus(s, rules, templateCount);
  const required = templatesRequired(rules, templateCount);
  const covered = templatesCovered(s);
  let next: string;
  if (status === 'new' || status === 'learning') {
    const parts: string[] = [];
    if (s.evidence < rules.threshold) parts.push(`evidence ${round1(s.evidence)} of ${rules.threshold}`);
    if (!s.legacy && covered < required) parts.push(`${covered} of ${required} problem types`);
    next = parts.length ? `Proficiency needs ${parts.join(' and ')}.` : 'Proficient on the next correct answer.';
  } else if (status === 'proficient') {
    const days = s.dueAt === null ? 0 : Math.max(0, Math.ceil((s.dueAt - now) / DAY));
    next = s.dueAt !== null && s.dueAt <= now
      ? 'Review due now: pass it to work towards mastery.'
      : `Next review in ${days} day${days === 1 ? '' : 's'}; mastery needs a review passed at least ${rules.reviewDelayDays} days after proficiency.`;
  } else {
    const days = s.dueAt === null ? 0 : Math.max(0, Math.ceil((s.dueAt - now) / DAY));
    next = s.dueAt !== null && s.dueAt <= now ? 'Review due now (a miss returns the skill to proficient).' : `Next review in ${days} day${days === 1 ? '' : 's'}.`;
  }
  return {
    status,
    evidenceFraction: Math.min(1, s.evidence / rules.threshold),
    evidence: s.evidence,
    templatesCovered: covered,
    templatesRequired: s.legacy ? 0 : required,
    dueAt: s.dueAt,
    next,
  };
};

/** Fold events over baseline skill states. */
export const foldSkills = (
  baseline: Partial<Record<TopicId, SkillState>>,
  events: AttemptEvent[],
  rules: MasteryRules,
  templateCount: (skill: TopicId) => number,
): Partial<Record<TopicId, SkillState>> => {
  const out: Partial<Record<TopicId, SkillState>> = { ...baseline };
  for (const e of events) {
    out[e.skillId] = applyEvent(out[e.skillId] ?? emptySkill(), e, rules, templateCount(e.skillId));
  }
  return out;
};
