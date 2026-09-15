import { TopicProgress } from '../types';

/**
 * The single definition of "mastered": at least `threshold` correct answers
 * under the CURRENT threshold. Unlocking, badges and the practice header all
 * use this; the persisted `mastery` boolean is only a cache of it.
 */
export const isTopicMastered = (progress: TopicProgress | undefined, threshold: number): boolean =>
  !!progress && progress.correct >= threshold;
