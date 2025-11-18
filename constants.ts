import { Level } from './types';

export const CURRICULUM: Level[] = [
  {
    id: 'basic-arithmetic',
    title: 'Basic Arithmetic',
    topics: [
      {
        id: 'addition',
        title: 'Addition',
        description: 'Practice adding numbers together.',
      },
      {
        id: 'subtraction',
        title: 'Subtraction',
        description: 'Practice finding the difference between numbers.',
      },
      {
        id: 'multiplication',
        title: 'Multiplication',
        description: 'Practice multiplying numbers.',
      },
      {
        id: 'division',
        title: 'Division',
        description: 'Practice dividing numbers.',
      },
      {
        id: 'multiplication-tables',
        title: 'Multiplication Tables',
        description: 'View and learn multiplication tables.',
        type: 'reference',
      },
    ],
  },
  {
    id: 'pre-algebra',
    title: 'Pre-Algebra',
    topics: [
        {
            id: 'simple-linear-equations',
            title: 'Simple Linear Equations',
            description: 'Solve for x in equations like "2x + 3 = 11".'
        }
    ]
  }
];

export const MASTERY_THRESHOLD = 10; // Number of correct answers to master a topic