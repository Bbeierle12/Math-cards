/**
 * What to practise next (docs/PLAN.md 3.3).
 *
 *  - The review queue: proficient skills whose review is due, most overdue
 *    first.
 *  - Within a skill: aim at the template with the fewest correct answers (so
 *    evidence spreads across problem types), then generate a FRESH seed; an
 *    instance already seen is avoided when the generator can produce another.
 *    Nothing is ever replayed.
 */
import type { GeneratorSettings, Problem, SkillState, TopicId } from '../../types';
import { fnv1a, randomSeed, createRng } from '../random';
import { GENERATORS, generateProblem } from '../generators';

/** Stable identity of a problem's content (text and answer), independent of its seed. */
export const instanceKey = (p: Problem): string =>
  fnv1a(`${p.problemText}\u0000${JSON.stringify(p.answer)}`).toString(36);

export interface DueReview { skillId: TopicId; dueAt: number }

export const dueReviews = (skills: Partial<Record<TopicId, SkillState>>, now: number): DueReview[] =>
  (Object.entries(skills) as [TopicId, SkillState | undefined][])
    .filter(([, s]) => s && s.proficientAt !== null && s.dueAt !== null && s.dueAt <= now)
    .map(([skillId, s]) => ({ skillId, dueAt: s!.dueAt! }))
    .sort((a, b) => a.dueAt - b.dueAt);

/** The template to aim at: fewest correct answers so far; ties broken by the seed. */
export const targetTemplate = (templates: readonly string[], state: SkillState | undefined, seed: string): string => {
  const counts = templates.map(t => state?.templates[t] ?? 0);
  const least = Math.min(...counts);
  const candidates = templates.filter((_, i) => counts[i] === least);
  return createRng(`target:${seed}`).pick(candidates);
};

/** Seeds tried before settling for a problem off target. */
export const SEARCH = 48;

/**
 * A fresh problem for `topicId`, aimed at an under-practised template and
 * avoiding problems already seen. Deterministic for a given base seed; the
 * seed that produced the problem is recorded on it, so it replays.
 */
export const nextProblem = (
  topicId: TopicId, settings: GeneratorSettings, state: SkillState | undefined, baseSeed: string = randomSeed(),
): Problem => {
  const def = GENERATORS.get(topicId);
  if (!def) return generateProblem(topicId, settings, baseSeed); // throws the usual error
  const target = targetTemplate(def.templates, state, baseSeed);
  const seen = new Set(state?.instances ?? []);
  let fallback: Problem | null = null;
  for (let i = 0; i < SEARCH; i++) {
    const p = generateProblem(topicId, settings, i === 0 ? baseSeed : `${baseSeed}.${i}`);
    const fresh = !seen.has(instanceKey(p));
    if (fresh && p.templateId === target) return p;
    if (!fallback || (fresh && seen.has(instanceKey(fallback)))) fallback = p;
  }
  return fallback!;
};
