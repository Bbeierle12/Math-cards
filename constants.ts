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
      },
      {
        id: 'fractions-basic',
        title: 'Basic Fractions',
        description: 'Add, subtract, multiply, and divide fractions.'
      },
      {
        id: 'decimals',
        title: 'Decimals',
        description: 'Operations with decimal numbers.'
      },
      {
        id: 'order-of-operations',
        title: 'Order of Operations',
        description: 'Practice PEMDAS/BODMAS rules.'
      },
      {
        id: 'integers',
        title: 'Integers',
        description: 'Work with positive and negative numbers.'
      }
    ]
  },
  {
    id: 'algebra-1',
    title: 'Algebra 1',
    topics: [
      {
        id: 'multi-step-equations',
        title: 'Multi-Step Equations',
        description: 'Solve equations requiring multiple steps.'
      },
      {
        id: 'inequalities',
        title: 'Linear Inequalities',
        description: 'Solve and graph inequalities.'
      },
      {
        id: 'systems-of-equations',
        title: 'Systems of Equations',
        description: 'Solve two equations simultaneously.'
      },
      {
        id: 'exponents',
        title: 'Exponent Rules',
        description: 'Simplify expressions with exponents.'
      },
      {
        id: 'polynomials',
        title: 'Polynomial Operations',
        description: 'Add, subtract, multiply polynomials.'
      },
      {
        id: 'factoring',
        title: 'Factoring',
        description: 'Factor quadratic expressions.'
      },
      {
        id: 'quadratic-equations',
        title: 'Quadratic Equations',
        description: 'Solve using factoring, completing the square, or formula.'
      }
    ]
  },
  {
    id: 'geometry',
    title: 'Geometry',
    topics: [
      {
        id: 'angles',
        title: 'Angles',
        description: 'Identify and measure angles.'
      },
      {
        id: 'triangles',
        title: 'Triangles',
        description: 'Properties and measurements of triangles.'
      },
      {
        id: 'pythagorean-theorem',
        title: 'Pythagorean Theorem',
        description: 'Find missing sides of right triangles.'
      },
      {
        id: 'area-perimeter',
        title: 'Area and Perimeter',
        description: 'Calculate area and perimeter of shapes.'
      },
      {
        id: 'circles',
        title: 'Circles',
        description: 'Circumference, area, and arc length.'
      },
      {
        id: 'volume-surface-area',
        title: 'Volume and Surface Area',
        description: '3D shape measurements.'
      }
    ]
  },
  {
    id: 'algebra-2',
    title: 'Algebra 2',
    topics: [
      {
        id: 'complex-numbers',
        title: 'Complex Numbers',
        description: 'Operations with imaginary numbers.'
      },
      {
        id: 'rational-expressions',
        title: 'Rational Expressions',
        description: 'Simplify and operate on algebraic fractions.'
      },
      {
        id: 'radicals',
        title: 'Radicals',
        description: 'Simplify square roots and radical expressions.'
      },
      {
        id: 'logarithms',
        title: 'Logarithms',
        description: 'Solve logarithmic equations.'
      },
      {
        id: 'sequences-series',
        title: 'Sequences and Series',
        description: 'Arithmetic and geometric sequences.'
      }
    ]
  },
  {
    id: 'trigonometry',
    title: 'Trigonometry',
    topics: [
      {
        id: 'unit-circle',
        title: 'Unit Circle',
        description: 'Memorize exact values for special angles.',
        type: 'reference'
      },
      {
        id: 'trig-ratios',
        title: 'Trigonometric Ratios',
        description: 'Calculate sin, cos, tan for right triangles.'
      },
      {
        id: 'trig-special-angles',
        title: 'Special Angles',
        description: 'Evaluate trig functions at 30°, 45°, 60°.'
      },
      {
        id: 'trig-identities',
        title: 'Trig Identities',
        description: 'Use and prove trigonometric identities.'
      },
      {
        id: 'trig-equations',
        title: 'Trig Equations',
        description: 'Solve equations with trig functions.'
      },
      {
        id: 'inverse-trig',
        title: 'Inverse Trig Functions',
        description: 'Find angles from trig values.'
      }
    ]
  },
  {
    id: 'pre-calculus',
    title: 'Pre-Calculus',
    topics: [
      {
        id: 'functions',
        title: 'Functions',
        description: 'Function notation and transformations.'
      },
      {
        id: 'polynomial-functions',
        title: 'Polynomial Functions',
        description: 'Analyze and graph polynomials.'
      },
      {
        id: 'rational-functions',
        title: 'Rational Functions',
        description: 'Asymptotes and behavior.'
      },
      {
        id: 'exponential-functions',
        title: 'Exponential Functions',
        description: 'Growth and decay problems.'
      },
      {
        id: 'conic-sections',
        title: 'Conic Sections',
        description: 'Circles, ellipses, parabolas, hyperbolas.'
      }
    ]
  },
  {
    id: 'calculus',
    title: 'Calculus',
    topics: [
      {
        id: 'limits',
        title: 'Limits',
        description: 'Evaluate limits of functions.'
      },
      {
        id: 'derivatives-basic',
        title: 'Basic Derivatives',
        description: 'Power rule and basic differentiation.'
      },
      {
        id: 'derivatives-product-quotient',
        title: 'Product and Quotient Rules',
        description: 'Differentiate products and quotients.'
      },
      {
        id: 'chain-rule',
        title: 'Chain Rule',
        description: 'Differentiate composite functions.'
      },
      {
        id: 'integrals-basic',
        title: 'Basic Integration',
        description: 'Integrate polynomials and simple functions.'
      },
      {
        id: 'integration-substitution',
        title: 'U-Substitution',
        description: 'Integration by substitution.'
      }
    ]
  }
];

export const MASTERY_THRESHOLD = 10; // Number of correct answers to master a topic

// Special angles for trigonometry (in degrees)
export const SPECIAL_ANGLES = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330, 360];

// Pythagorean triples for geometry problems
export const PYTHAGOREAN_TRIPLES = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
  [9, 40, 41],
  [6, 8, 10],  // Multiple of 3-4-5
  [9, 12, 15], // Multiple of 3-4-5
];

// Practice mode types
export const PRACTICE_MODES = {
  SPEED_DRILL: 'speed-drill',
  STANDARD: 'standard',
  THOUGHTFUL: 'thoughtful',
} as const;