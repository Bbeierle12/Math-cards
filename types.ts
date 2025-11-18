export type TopicId = 
  'addition' | 
  'subtraction' | 
  'multiplication' | 
  'division' |
  'multiplication-tables' |
  'simple-linear-equations';

export interface Problem {
  id: string;
  topicId: TopicId;
  problemText: string;
  answerType: 'numeric';
  correctAnswer: number;
  explanationPrompt: string;
}

export interface Topic {
  id: TopicId;
  title: string;
  description: string;
  type?: 'practice' | 'reference';
}

export interface Level {
  id: string;
  title: string;
  topics: Topic[];
}

export interface TopicProgress {
  correct: number;
  attempted: number;
  mastery: boolean;
}

export interface UserProgress {
  topicProgress: Partial<Record<TopicId, TopicProgress>>;
  totalProblemsAttempted: number;
  totalCorrect: number;
  currentStreak: number;
  longestStreak: number;
}