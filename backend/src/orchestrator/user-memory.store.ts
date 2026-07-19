// ─────────────────────────────────────────────────────────────────────────────
// User Memory Store
// Persists user preferences and facts across conversation turns.
// This enables true memory: user says "I'm diabetic" once → all future
// recommendations are silently adjusted for low-sugar, near-medical routing.
// ─────────────────────────────────────────────────────────────────────────────

export interface UserMemory {
  userId: string;
  lastUpdated: Date;

  // Persistent profile (extracted from conversation over time)
  isDiabetic: boolean;
  isWheelchairUser: boolean;
  hasChildren: boolean;
  hasElderly: boolean;
  preferredLanguage: string;
  dietaryPreferences: string[]; // e.g. ['vegetarian', 'gluten-free']
  avoidedAreas: string[]; // persistent avoidances
  medicalConditions: string[]; // e.g. ['heart condition']
  preferredGate?: string;

  // Session state (reset each stadium visit)
  currentSection?: string;
  visitedFacilities: string[]; // tracks where user has been
  lastKnownLocation?: string;
  emergencyContacted: boolean;
}

const DEFAULT_MEMORY = (): Omit<UserMemory, 'userId' | 'lastUpdated'> => ({
  isDiabetic: false,
  isWheelchairUser: false,
  hasChildren: false,
  hasElderly: false,
  preferredLanguage: 'en',
  dietaryPreferences: [],
  avoidedAreas: [],
  medicalConditions: [],
  preferredGate: undefined,
  currentSection: undefined,
  visitedFacilities: [],
  lastKnownLocation: undefined,
  emergencyContacted: false,
});

class UserMemoryStore {
  private readonly store = new Map<string, UserMemory>();

  get(userId: string): UserMemory {
    if (!this.store.has(userId)) {
      this.store.set(userId, {
        userId,
        lastUpdated: new Date(),
        ...DEFAULT_MEMORY(),
      });
    }
    // After set above, the entry is guaranteed to exist
    const entry = this.store.get(userId);
    if (!entry) throw new Error(`UserMemory: failed to create entry for ${userId}`);
    return entry;
  }

  // Called after each request to learn from the conversation
  updateFromQuery(userId: string, query: string, language?: string): void {
    const mem = this.get(userId);
    const q = query.toLowerCase();

    // Learn medical facts
    if (/diabet(?:ic|es)/i.test(q)) mem.isDiabetic = true;
    if (/wheelchair|can(?:not|'t)\s+walk/i.test(q)) mem.isWheelchairUser = true;
    if (/with\s+(?:my\s+)?(?:children|kids|baby)/i.test(q)) mem.hasChildren = true;
    if (/with\s+(?:my\s+)?(?:elderly|grandparent|senior)/i.test(q)) mem.hasElderly = true;

    // Learn dietary preferences
    if (/vegetarian/i.test(q) && !mem.dietaryPreferences.includes('vegetarian')) {
      mem.dietaryPreferences.push('vegetarian');
    }
    if (/vegan/i.test(q) && !mem.dietaryPreferences.includes('vegan')) {
      mem.dietaryPreferences.push('vegan');
    }
    if (/gluten.free/i.test(q) && !mem.dietaryPreferences.includes('gluten-free')) {
      mem.dietaryPreferences.push('gluten-free');
    }

    // Learn language preference
    if (language && language !== 'en') {
      mem.preferredLanguage = language;
    }

    // Learn areas to avoid persistently
    const avoidMatch = query.match(/(?:always\s+)?avoid\s+([A-Za-z0-9 ]+)/gi);
    if (avoidMatch) {
      avoidMatch.forEach((m) => {
        const area = m.replace(/^(?:always\s+)?avoid\s+/i, '').trim();
        if (!mem.avoidedAreas.includes(area)) {
          mem.avoidedAreas.push(area);
        }
      });
    }

    mem.lastUpdated = new Date();
    this.store.set(userId, mem);
  }

  markFacilityVisited(userId: string, facility: string): void {
    const mem = this.get(userId);
    if (!mem.visitedFacilities.includes(facility)) {
      mem.visitedFacilities.push(facility);
    }
    this.store.set(userId, mem);
  }

  toContextString(userId: string): string {
    const mem = this.get(userId);
    const facts: string[] = [];

    if (mem.isDiabetic)
      facts.push('User is diabetic — always prioritize low-sugar food, keep near medical room');
    if (mem.isWheelchairUser)
      facts.push('User requires wheelchair — step-free routes only, no stairs');
    if (mem.hasChildren) facts.push('User is travelling with children — family-friendly routing');
    if (mem.hasElderly) facts.push('User is travelling with elderly — minimize walking, no stairs');
    if (mem.dietaryPreferences.length > 0)
      facts.push(`Dietary requirements: ${mem.dietaryPreferences.join(', ')}`);
    if (mem.avoidedAreas.length > 0)
      facts.push(`Persistent avoidances: ${mem.avoidedAreas.join(', ')}`);
    if (mem.visitedFacilities.length > 0)
      facts.push(`Already visited: ${mem.visitedFacilities.join(', ')}`);

    return facts.length > 0 ? facts.join('\n') : 'No persistent preferences recorded yet.';
  }
}

// Singleton — one store per process
export const userMemory = new UserMemoryStore();
