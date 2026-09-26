/**
 * Generator registry.
 *
 * generateProblem(topicId, settings, seed) is a pure function: the same
 * arguments give the same problem, so any problem a student saw can be
 * replayed exactly from the provenance recorded on it (generatorId,
 * generatorVersion, seed, settings).
 *
 * A generator states the validity conditions of its instance with
 * ctx.require(). When one fails the draft is discarded and the generator runs
 * again on a seed derived from the original one (still deterministic); if no
 * valid instance turns up the generator is broken and generation fails loudly
 * instead of shipping an invalid problem. Every draft also passes the
 * structural checks in ./checks.ts (well-formed answer spec, no leaked NaN or
 * undefined, balanced LaTeX); a draft that fails them is a generator bug and
 * throws immediately.
 */
import type { GeneratorSettings, Problem, TopicId } from '../../types';
import { createRng, randomSeed } from '../random';
import { InvariantViolation, stepsFromExplanation } from './context';
import { checkDraft } from './checks';
import type { GenContext, GeneratorDef } from './context';
import * as arithmetic from './arithmetic';
import * as prealgebra from './prealgebra';
import * as algebra1 from './algebra1';
import * as geometry from './geometry';
import * as algebra2 from './algebra2';
import * as trigonometry from './trigonometry';
import * as precalculus from './precalculus';
import * as calculus1 from './calculus1';
import * as calculus2 from './calculus2';

const MODULES = [arithmetic, prealgebra, algebra1, geometry, algebra2, trigonometry, precalculus, calculus1, calculus2];

const buildRegistry = (): Map<TopicId, GeneratorDef> => {
  const registry = new Map<TopicId, GeneratorDef>();
  for (const mod of MODULES) {
    const defs = Object.values(mod).filter((v): v is GeneratorDef =>
      typeof v === 'object' && v !== null && 'topicId' in v && typeof (v as GeneratorDef).generate === 'function');
    for (const def of defs) {
      if (registry.has(def.topicId)) throw new Error(`two generators for topic ${def.topicId}`);
      registry.set(def.topicId, def);
    }
  }
  return registry;
};

export const GENERATORS: ReadonlyMap<TopicId, GeneratorDef> = buildRegistry();

/** Attempts before a generator whose invariants keep failing is declared broken. */
export const MAX_ATTEMPTS = 64;

const attemptSeed = (topicId: TopicId, seed: string, attempt: number): string =>
  (attempt === 0 ? `${topicId}:${seed}` : `${topicId}:${seed}#${attempt}`);

const hasSettings = (s: GeneratorSettings): boolean => s.numberRange !== undefined || s.allowNegatives !== undefined;

export const hasGenerator = (topicId: TopicId): boolean => GENERATORS.has(topicId);

/**
 * Run one generator definition on a seed: retries on invariant violations
 * (with derived seeds), fails loudly when none of MAX_ATTEMPTS instances is
 * valid, and records provenance on the problem.
 */
export const instantiate = (def: GeneratorDef, settings: GeneratorSettings, seed: string): Problem => {
  let lastViolation = '';
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rng = createRng(attemptSeed(def.topicId, seed, attempt));
    const ctx: GenContext = {
      ...rng,
      settings,
      require: (condition, invariant) => {
        if (!condition) throw new InvariantViolation(invariant);
      },
    };
    let draft;
    try {
      draft = def.generate(ctx);
    } catch (e) {
      if (e instanceof InvariantViolation) {
        lastViolation = e.invariant;
        continue;
      }
      throw e;
    }
    const defects = checkDraft(draft);
    if (!def.templates.includes(draft.templateId)) defects.push(`templateId "${draft.templateId}" is not declared in templates`);
    if (defects.length > 0) {
      throw new Error(`generator ${def.topicId} v${def.version} produced an invalid problem (seed ${JSON.stringify(seed)}): ${defects.join('; ')}`);
    }
    const problem: Problem = {
      id: `${def.topicId}@${def.version}:${seed}`,
      topicId: def.topicId,
      problemText: draft.problemText,
      answer: draft.answer,
      explanation: draft.explanation,
      solution: draft.solution ?? stepsFromExplanation(draft.explanation),
      generatorId: def.topicId,
      generatorVersion: def.version,
      seed,
      templateId: draft.templateId,
    };
    if (draft.displayAnswer !== undefined) problem.displayAnswer = draft.displayAnswer;
    if (draft.hint !== undefined) problem.hint = draft.hint;
    if (hasSettings(settings)) problem.settings = settings;
    return problem;
  }
  throw new Error(
    `generator ${def.topicId} v${def.version} found no valid instance in ${MAX_ATTEMPTS} attempts `
    + `(seed ${JSON.stringify(seed)}; last violated invariant: ${lastViolation})`,
  );
};

export const generateProblem = (topicId: TopicId, settings: GeneratorSettings = {}, seed: string = randomSeed()): Problem => {
  const def = GENERATORS.get(topicId);
  if (!def) throw new Error(`Problem generator not yet implemented for topic: ${topicId}`);
  return instantiate(def, settings, seed);
};

export { InvariantViolation };
export type { GeneratorDef, GenContext, Draft } from './context';
