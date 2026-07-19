import { userMemory } from './user-memory.store';

describe('UserMemoryStore', () => {
  const testUserId = 'test-user-123';

  afterEach(() => {
    // Clean up test user
    userMemory.get(testUserId);
  });

  describe('get()', () => {
    it('should create a default memory for new users', () => {
      const mem = userMemory.get(testUserId);
      expect(mem.userId).toBe(testUserId);
      expect(mem.isDiabetic).toBe(false);
      expect(mem.isWheelchairUser).toBe(false);
      expect(mem.dietaryPreferences).toEqual([]);
      expect(mem.avoidedAreas).toEqual([]);
      expect(mem.visitedFacilities).toEqual([]);
    });

    it('should return existing memory for known users', () => {
      const mem1 = userMemory.get(testUserId);
      mem1.isDiabetic = true;
      const mem2 = userMemory.get(testUserId);
      expect(mem2.isDiabetic).toBe(true);
    });
  });

  describe('updateFromQuery()', () => {
    it('should learn diabetic condition', () => {
      userMemory.updateFromQuery(testUserId, 'I am diabetic');
      const mem = userMemory.get(testUserId);
      expect(mem.isDiabetic).toBe(true);
    });

    it('should learn wheelchair use', () => {
      userMemory.updateFromQuery(testUserId, 'I use a wheelchair');
      const mem = userMemory.get(testUserId);
      expect(mem.isWheelchairUser).toBe(true);
    });

    it('should learn vegetarian preference', () => {
      userMemory.updateFromQuery(testUserId, 'I am vegetarian');
      const mem = userMemory.get(testUserId);
      expect(mem.dietaryPreferences).toContain('vegetarian');
    });

    it('should learn vegan preference', () => {
      userMemory.updateFromQuery(testUserId, 'I am vegan');
      const mem = userMemory.get(testUserId);
      expect(mem.dietaryPreferences).toContain('vegan');
    });

    it('should learn avoided areas', () => {
      userMemory.updateFromQuery(testUserId, 'Always avoid Gate 6');
      const mem = userMemory.get(testUserId);
      expect(mem.avoidedAreas).toContain('Gate 6');
    });

    it('should learn language preference', () => {
      userMemory.updateFromQuery(testUserId, 'Hello', 'es');
      const mem = userMemory.get(testUserId);
      expect(mem.preferredLanguage).toBe('es');
    });

    it('should learn children', () => {
      userMemory.updateFromQuery(testUserId, 'I am with my kids');
      const mem = userMemory.get(testUserId);
      expect(mem.hasChildren).toBe(true);
    });
  });

  describe('markFacilityVisited()', () => {
    it('should track visited facilities', () => {
      userMemory.markFacilityVisited(testUserId, 'Restroom C4');
      const mem = userMemory.get(testUserId);
      expect(mem.visitedFacilities).toContain('Restroom C4');
    });

    it('should not duplicate visited facilities', () => {
      userMemory.markFacilityVisited(testUserId, 'Restroom C4');
      userMemory.markFacilityVisited(testUserId, 'Restroom C4');
      const mem = userMemory.get(testUserId);
      const count = mem.visitedFacilities.filter(f => f === 'Restroom C4').length;
      expect(count).toBe(1);
    });
  });

  describe('toContextString()', () => {
    it('should return no-prefs message for fresh user', () => {
      const str = userMemory.toContextString('fresh-user-999');
      expect(str).toContain('No persistent preferences');
    });

    it('should serialize known preferences', () => {
      const mem = userMemory.get(testUserId);
      mem.isDiabetic = true;
      mem.dietaryPreferences = ['vegetarian'];
      const str = userMemory.toContextString(testUserId);
      expect(str).toContain('diabetic');
      expect(str).toContain('vegetarian');
    });
  });
});
