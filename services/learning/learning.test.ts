import { describe, it, expect } from 'vitest';
import type { AttemptEvent, SkillState, TopicId, UserProgress } from '../../types';
import {
  applyEvent, emptySkill, evidenceWeight, foldSkills, meetsProficiency, rulesFor, skillStatus, describeSkill,
  nextInterval, lapseInterval, LADDER, DAY,
  emptyLog, migrateLegacy, deriveTotals, appendEvent, deriveSkills, sanitizeLog, MAX_EVENTS, KEEP_EVENTS,
  dueReviews, targetTemplate, nextProblem, instanceKey,
} from './index';
import { GENERATORS, generateProblem } from '../generators';

const rules = rulesFor(10);
const T0 = Date.UTC(2026, 0, 1);
let counter = 0;
const ev = (over: Partial<AttemptEvent> = {}): AttemptEvent => ({
  t: T0, skillId: 'limits', generatorVersion: 1, templateId: 'a', seed: `s${counter}`, instance: `i${counter++}`,
  correct: true, firstAttempt: true, hintUsed: false, ...over,
});
/** Fold events for one skill with `templates` available. */
const run = (events: AttemptEvent[], templates = 3, r = rules, start: SkillState = emptySkill()): SkillState =>
  events.reduce((s, e) => applyEvent(s, e, r, templates), start);
/** n correct first attempts spread over the given templates, one minute apart. */
const correctRun = (n: number, templates: string[], t0 = T0): AttemptEvent[] =>
  Array.from({ length: n }, (_, i) => ev({ t: t0 + i * 60_000, templateId: templates[i % templates.length] }));

describe('evidence weights', () => {
  it('count fresh first attempts fully and discount help, retries and repeats', () => {
    const s = emptySkill();
    expect(evidenceWeight(s, ev(), rules)).toBe(1);
    expect(evidenceWeight(s, ev({ firstAttempt: false }), rules)).toBe(0.25);
    expect(evidenceWeight(s, ev({ hintUsed: true }), rules)).toBe(0.5);
    const seen = { ...s, instances: ['same'] };
    expect(evidenceWeight(seen, ev({ instance: 'same' }), rules)).toBe(0.25);
    expect(evidenceWeight(s, ev({ correct: false }), rules)).toBe(-0.5);
  });

  it('never go below zero', () => {
    const s = run([ev({ correct: false }), ev({ correct: false })]);
    expect(s.evidence).toBe(0);
    expect(s.attempted).toBe(2);
    expect(s.correct).toBe(0);
  });
});

describe('proficiency', () => {
  it('needs the threshold AND evidence across min(3, available) templates', () => {
    const oneTemplate = run(correctRun(12, ['a']), 4);
    expect(oneTemplate.evidence).toBe(12);
    expect(meetsProficiency(oneTemplate, rules, 4)).toBe(false);
    expect(skillStatus(oneTemplate, rules, 4)).toBe('learning');
    expect(describeSkill(oneTemplate, rules, 4, T0).next).toMatch(/1 of 3 problem types/);

    const spread = run(correctRun(10, ['a', 'b', 'c']), 4);
    expect(skillStatus(spread, rules, 4)).toBe('proficient');

    // a generator with a single template needs only that one
    expect(skillStatus(run(correctRun(10, ['a']), 1), rules, 1)).toBe('proficient');
    // two templates available: both are required
    expect(skillStatus(run(correctRun(10, ['a']), 2), rules, 2)).toBe('learning');
    expect(skillStatus(run(correctRun(10, ['a', 'b']), 2), rules, 2)).toBe('proficient');
  });

  it('cannot be reached by repeating one problem', () => {
    const same = Array.from({ length: 30 }, (_, i) => ev({ t: T0 + i, templateId: ['a', 'b', 'c'][i % 3], instance: 'same' }));
    const s = run(same);
    expect(s.evidence).toBeCloseTo(1 + 29 * 0.25, 9);
    // 30 correct answers to one problem are worth less than 9 fresh ones
    expect(s.evidence).toBeLessThan(9);
  });

  it('errors cost evidence, so guessing does not accumulate', () => {
    const alternating = Array.from({ length: 40 }, (_, i) => ev({ t: T0 + i, templateId: ['a', 'b', 'c'][i % 3], correct: i % 3 !== 0 }));
    const s = run(alternating);
    expect(s.correct).toBe(26);
    // 14 errors at −0.5 each, except the first, which the floor at 0 absorbs
    expect(s.evidence).toBeCloseTo(26 - 13 * 0.5, 9);
  });

  it('follows the threshold setting over the whole history', () => {
    const events = correctRun(8, ['a', 'b', 'c']);
    expect(skillStatus(run(events, 3, rulesFor(10)), rulesFor(10), 3)).toBe('learning');
    expect(skillStatus(run(events, 3, rulesFor(5)), rulesFor(5), 3)).toBe('proficient');
  });

  it('starts the review schedule when reached', () => {
    const s = run(correctRun(10, ['a', 'b', 'c']));
    expect(s.proficientAt).toBe(T0 + 9 * 60_000);
    expect(s.stability).toBe(1);
    expect(s.dueAt).toBe(s.proficientAt! + DAY);
  });
});

describe('mastery by delayed review', () => {
  const proficient = () => run(correctRun(10, ['a', 'b', 'c']));

  it('practice before the review is due is not a review', () => {
    const s = proficient();
    const early = run([ev({ t: s.dueAt! - 1000, templateId: 'a' })], 3, rules, s);
    expect(early.lastReviewAt).toBeNull();
    expect(early.dueAt).toBe(s.dueAt);
    expect(early.mastered).toBe(false);
  });

  it('a review passed at least 3 days after proficiency masters the skill', () => {
    const s = proficient();
    const day1 = run([ev({ t: s.dueAt!, templateId: 'b' })], 3, rules, s);
    expect(day1.mastered).toBe(false); // only 1 day after proficiency
    expect(day1.stability).toBe(3);
    const day4 = run([ev({ t: day1.dueAt!, templateId: 'c' })], 3, rules, day1);
    expect(day4.mastered).toBe(true);
    expect(day4.stability).toBe(7);
    expect(skillStatus(day4, rules, 3)).toBe('mastered');
  });

  it('a review with a hint or a wrong answer does not master, and a miss undoes mastery', () => {
    const s = proficient();
    const late = run([ev({ t: s.proficientAt! + 5 * DAY, hintUsed: true })], 3, rules, s);
    expect(late.mastered).toBe(false);
    expect(late.lapses).toBe(1);

    const mastered = run([ev({ t: s.proficientAt! + 4 * DAY })], 3, rules, s);
    expect(mastered.mastered).toBe(true);
    const missed = run([ev({ t: mastered.dueAt!, correct: false })], 3, rules, mastered);
    expect(missed.mastered).toBe(false);
    expect(skillStatus(missed, rules, 3)).toBe('proficient'); // reversible, but not all the way down
    expect(missed.stability).toBe(lapseInterval(mastered.stability));
    expect(missed.lapses).toBe(1);
  });

  it('losing proficiency clears mastery and the schedule', () => {
    const s = proficient();
    const errors = Array.from({ length: 4 }, (_, i) => ev({ t: s.dueAt! + i, correct: false }));
    const lost = run(errors, 3, rules, s);
    expect(lost.evidence).toBe(8);
    expect(skillStatus(lost, rules, 3)).toBe('learning');
    expect(lost.dueAt).toBeNull();
    expect(lost.proficientAt).toBeNull();
  });
});

describe('the review ladder', () => {
  it('climbs 1 → 3 → 7 → 21 → 60 and then grows by 2.5×', () => {
    expect(LADDER).toEqual([1, 3, 7, 21, 60]);
    expect(nextInterval(1, 1)).toBe(3);
    expect(nextInterval(3, 3)).toBe(7);
    expect(nextInterval(7, 7)).toBe(21);
    expect(nextInterval(21, 21)).toBe(60);
    expect(nextInterval(60, 60)).toBe(150);
  });

  it('a late success skips rungs; a failure halves the interval, never below a day', () => {
    expect(nextInterval(3, 10)).toBe(21);
    expect(lapseInterval(21)).toBe(10.5);
    expect(lapseInterval(1)).toBe(1);
  });
});

describe('the learning log', () => {
  const legacy: UserProgress = {
    topicProgress: { limits: { correct: 12, attempted: 15, mastery: true }, factoring: { correct: 3, attempted: 9, mastery: false } },
    totalProblemsAttempted: 24, totalCorrect: 15, currentStreak: 2, longestStreak: 7,
  };

  it('migrates counter-based progress without losing any of it', () => {
    const log = migrateLegacy(legacy, T0, rules);
    const skills = deriveSkills(log, rules, () => 4);
    // a topic mastered under the old rule stays proficient, and is scheduled for review
    expect(skillStatus(skills.limits, rules, 4)).toBe('proficient');
    expect(skills.limits!.dueAt).toBe(T0 + DAY);
    expect(skillStatus(skills.factoring, rules, 4)).toBe('learning');
    expect(skills.factoring!.evidence).toBe(3);
    expect(deriveTotals(log)).toEqual({ attempted: 24, correct: 15, currentStreak: 2, longestStreak: 7 });
    expect(log.migratedAt).toBe(T0);
    // migration only reads the old record
    expect(legacy.topicProgress.limits).toEqual({ correct: 12, attempted: 15, mastery: true });
  });

  it('derives totals and streaks from events on top of the baseline', () => {
    let log = migrateLegacy(legacy, T0, rules);
    for (const correct of [true, true, false, true, true, true, true, true, true]) log = appendEvent(log, ev({ correct }), rules, () => 3);
    expect(deriveTotals(log)).toEqual({ attempted: 33, correct: 23, currentStreak: 6, longestStreak: 7 });
    log = appendEvent(log, ev(), rules, () => 3);
    expect(deriveTotals(log).longestStreak).toBe(7);
    log = appendEvent(log, ev(), rules, () => 3);
    expect(deriveTotals(log).longestStreak).toBe(8);
  });

  it('compacts old events into the baseline without changing what is derived', () => {
    const count = (s: TopicId) => (s === 'limits' ? 3 : 1);
    const skills: TopicId[] = ['limits', 'addition'];
    let log = emptyLog();
    const all: AttemptEvent[] = [];
    for (let i = 0; i <= MAX_EVENTS; i++) {
      const e = ev({ t: T0 + i * 3_600_000, skillId: skills[i % 2], templateId: ['a', 'b', 'c'][i % 3], correct: i % 7 !== 0 });
      all.push(e);
      log = appendEvent(log, e, rules, count);
    }
    expect(log.events.length).toBe(KEEP_EVENTS);
    const uncompacted = { ...emptyLog(), events: all };
    expect(deriveTotals(log)).toEqual(deriveTotals(uncompacted));
    expect(deriveSkills(log, rules, count)).toEqual(deriveSkills(uncompacted, rules, count));
  });

  it('rebuilds a well-formed log from whatever was stored', () => {
    for (const raw of [null, 5, 'log', [], {}, { version: 2 }]) expect(sanitizeLog(raw)).toBeNull();
    const log = sanitizeLog({
      version: 1,
      baseline: { skills: { limits: { evidence: -3, correct: 2, attempted: 1, templates: { a: 2, b: 'x' }, instances: ['p', 3], mastered: true, proficientAt: null } }, attempted: 5, correct: 9 },
      events: [ev({ t: T0 + 5 }), { t: 'soon' }, ev({ t: T0 + 1 }), null],
    })!;
    expect(log.events.map(e => e.t)).toEqual([T0 + 1, T0 + 5]); // malformed dropped, sorted by time
    const skill = log.baseline.skills.limits!;
    expect(skill.evidence).toBe(0);
    expect(skill.attempted).toBe(2); // never fewer attempts than correct answers
    expect(skill.templates).toEqual({ a: 2 });
    expect(skill.instances).toEqual(['p']);
    expect(skill.mastered).toBe(false); // mastery without proficiency is not a state
    expect(log.baseline.correct).toBe(5);
  });
});

describe('scheduling', () => {
  it('queues due reviews, most overdue first', () => {
    const due = (dueAt: number | null): SkillState => ({ ...emptySkill(), proficientAt: T0, dueAt, stability: 1 });
    const queue = dueReviews({ limits: due(T0 + 2 * DAY), factoring: due(T0 + DAY), addition: due(T0 + 9 * DAY), angles: emptySkill() }, T0 + 3 * DAY);
    expect(queue.map(q => q.skillId)).toEqual(['factoring', 'limits']);
  });

  it('aims at the template with the fewest correct answers', () => {
    const s: SkillState = { ...emptySkill(), templates: { a: 3, b: 1, c: 2 } };
    expect(targetTemplate(['a', 'b', 'c'], s, 'x')).toBe('b');
    expect(['b', 'c']).toContain(targetTemplate(['a', 'b', 'c'], { ...s, templates: { a: 3 } }, 'x'));
  });

  it('generates a fresh, replayable problem of the target template', () => {
    const state: SkillState = { ...emptySkill(), templates: { 'x-exp': 4, 'x-trig': 4, 'xn-ln': 4 } };
    const p = nextProblem('integration-by-parts', {}, state, 'base');
    expect(p.templateId).toBe('x2-exp');
    expect(nextProblem('integration-by-parts', {}, state, 'base')).toEqual(p); // deterministic
    expect(generateProblem(p.generatorId, p.settings, p.seed)).toEqual(p); // replayable from its own seed
  });

  it('avoids problems already seen while unseen ones exist', () => {
    // walk the whole instance space of the smallest topic without a repeat
    const topic: TopicId = 'trig-identities';
    let state = emptySkill();
    const distinct = new Set<string>();
    for (let i = 0; i < 400; i++) distinct.add(instanceKey(generateProblem(topic, {}, `all-${i}`)));
    for (let i = 0; i < distinct.size; i++) {
      const p = nextProblem(topic, {}, state, `walk-${i}`);
      const key = instanceKey(p);
      expect(state.instances, `repeat after ${i} problems`).not.toContain(key);
      state = applyEvent(state, ev({ t: T0 + i, skillId: topic, templateId: p.templateId, instance: key }), rules, GENERATORS.get(topic)!.templates.length);
    }
  });

  it('every practice topic can reach proficiency on fresh problems alone', () => {
    for (const [topic, def] of GENERATORS) {
      let state = emptySkill();
      let attempts = 0;
      while (skillStatus(state, rules, def.templates.length) !== 'proficient' && attempts < 60) {
        const p = nextProblem(topic, {}, state, `prof-${attempts}`);
        const key = instanceKey(p);
        expect(state.instances, `${topic}: repeat before proficiency`).not.toContain(key);
        state = applyEvent(state, ev({ t: T0 + attempts, skillId: topic, templateId: p.templateId, instance: key }), rules, def.templates.length);
        attempts++;
      }
      expect(skillStatus(state, rules, def.templates.length), `${topic} after ${attempts} correct answers`).toBe('proficient');
      expect(attempts, topic).toBe(10); // exactly the threshold: every answer was fresh evidence
    }
  });

  it('foldSkills folds each skill independently', () => {
    const events = [ev({ skillId: 'limits' }), ev({ skillId: 'addition', correct: false }), ev({ skillId: 'limits' })];
    const skills = foldSkills({}, events, rules, () => 1);
    expect(skills.limits!.correct).toBe(2);
    expect(skills.addition!.attempted).toBe(1);
  });
});
