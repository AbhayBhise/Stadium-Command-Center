// ─────────────────────────────────────────────────────────────────────────────
// Stage 1: Intent Detection
// Classifies the user's query into a structured intent without calling Gemini.
// Uses keyword matching + pattern scoring for speed (<100ms target).
// ─────────────────────────────────────────────────────────────────────────────

import { DetectedIntent, IntentType } from './orchestrator.types';

interface IntentPattern {
  intent: IntentType;
  keywords: string[];
  weight: number;
}

const INTENT_PATTERNS: IntentPattern[] = [
  {
    intent: 'EMERGENCY',
    keywords: ['emergency', 'fire', 'medical', 'help', 'danger', 'accident', 'ambulance', 'police', 'lost', 'child', 'kid'],
    weight: 10, // highest priority — always wins if matched
  },
  {
    intent: 'NAVIGATION',
    keywords: [
      'where',
      'how to get',
      'directions',
      'route',
      'gate',
      'seat',
      'find',
      'go to',
      'entrance',
      'exit',
      'stand',
      'section',
      'faster',
      'quicker',
      'shortest',
      'avoid',
    ],
    weight: 3,
  },
  {
    intent: 'ACCESSIBILITY',
    keywords: [
      'wheelchair',
      'accessible',
      'elevator',
      'escalator',
      'disability',
      'mobility',
      'ramp',
      'special needs',
      'stairs',
      'steps',
    ],
    weight: 4,
  },
  {
    intent: 'CROWD_QUERY',
    keywords: ['crowd', 'busy', 'congestion', 'queue', 'wait', 'people', 'packed', 'full'],
    weight: 4, // higher than NAVIGATION so crowd keywords win ties
  },
  {
    intent: 'VOLUNTEER_HELP',
    keywords: [
      'volunteer',
      'staff',
      'duty',
      'assigned',
      'zone',
      'incident',
      'report',
      'protocol',
      'procedure',
      'sop',
    ],
    weight: 3,
  },
  {
    intent: 'PLANNING',
    keywords: [
      'plan',
      'schedule',
      'arrive',
      'parking',
      'before',
      'itinerary',
      'visit',
      'prepare',
      'trip',
      'kickoff',
      'miss',
      'late',
    ],
    weight: 3,
  },
  {
    intent: 'FACILITY_SEARCH',
    keywords: [
      'toilet',
      'washroom',
      'bathroom',
      'food',
      'eat',
      'drink',
      'atm',
      'cash',
      'medical',
      'first aid',
      'merchandise',
      'water',
      'quieter',
      'quiet',
      'empty',
      'less crowded',
    ],
    weight: 4, // higher than NAVIGATION so facility keywords win ties
  },
];

export class IntentDetectionService {
  detect(query: string): DetectedIntent {
    const normalizedQuery = query.toLowerCase();
    const scores = new Map<IntentType, { score: number; matchedKeywords: string[] }>();

    for (const pattern of INTENT_PATTERNS) {
      const matched: string[] = [];
      for (const keyword of pattern.keywords) {
        if (normalizedQuery.includes(keyword)) {
          matched.push(keyword);
        }
      }
      if (matched.length > 0) {
        const existing = scores.get(pattern.intent);
        const score = matched.length * pattern.weight;
        if (!existing || score > existing.score) {
          scores.set(pattern.intent, { score, matchedKeywords: matched });
        }
      }
    }

    if (scores.size === 0) {
      return { intent: 'GENERAL', confidence: 0.4, keywords: [] };
    }

    // Find highest scoring intent
    let bestIntent: IntentType = 'GENERAL';
    let bestScore = 0;
    let bestKeywords: string[] = [];

    scores.forEach((value, key) => {
      if (value.score > bestScore) {
        bestScore = value.score;
        bestIntent = key;
        bestKeywords = value.matchedKeywords;
      }
    });

    const emergencyScore = scores.get('EMERGENCY');
    if (emergencyScore) {
      return {
        intent: 'EMERGENCY',
        confidence: 0.99,
        keywords: emergencyScore.matchedKeywords,
      };
    }

    // Normalize confidence: cap at 0.95, floor at 0.5 when matched
    const maxPossibleScore = 10 * 10;
    const rawConfidence = Math.min(bestScore / maxPossibleScore, 0.95);
    const confidence = Math.max(rawConfidence + 0.45, 0.5);

    return {
      intent: bestIntent,
      confidence: Math.min(confidence, 0.95),
      keywords: bestKeywords,
    };
  }
}
