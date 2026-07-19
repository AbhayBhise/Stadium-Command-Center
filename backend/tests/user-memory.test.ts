import { userMemory } from '../src/orchestrator/user-memory.store';

describe('UserMemoryStore', () => {
  const testUserId = 'test-user-mem-1';
  beforeAll(() => {
    userMemory.updateFromQuery(testUserId, 'reset');
  });

  it('should return default memory for unknown user', () => {
    const mem = userMemory.get('new-user');
    expect(mem.userId).toBe('new-user');
    expect(mem.isDiabetic).toBe(false);
    expect(mem.isWheelchairUser).toBe(false);
    expect(mem.preferredLanguage).toBe('en');
  });

  it('should learn diabetes from query', () => {
    userMemory.updateFromQuery(testUserId, 'I am diabetic');
    const mem = userMemory.get(testUserId);
    expect(mem.isDiabetic).toBe(true);
  });

  it('should learn wheelchair from query', () => {
    userMemory.updateFromQuery(testUserId, 'I use a wheelchair');
    const mem = userMemory.get(testUserId);
    expect(mem.isWheelchairUser).toBe(true);
  });

  it('should learn children from query', () => {
    userMemory.updateFromQuery(testUserId, 'I am with my kids');
    const mem = userMemory.get(testUserId);
    expect(mem.hasChildren).toBe(true);
  });

  it('should learn dietary preferences', () => {
    userMemory.updateFromQuery(testUserId, 'I am vegetarian');
    const mem = userMemory.get(testUserId);
    expect(mem.dietaryPreferences).toContain('vegetarian');
  });

  it('should learn language preference', () => {
    userMemory.updateFromQuery(testUserId, 'Hello', 'es');
    const mem = userMemory.get(testUserId);
    expect(mem.preferredLanguage).toBe('es');
  });

  it('should learn re-query update language', () => {
    userMemory.updateFromQuery(testUserId, 'Bonjour', 'fr');
    const mem = userMemory.get(testUserId);
    expect(mem.preferredLanguage).toBe('fr');
  });

  it('should return context string with facts', () => {
    const context = userMemory.toContextString(testUserId);
    expect(context).not.toBe('No persistent preferences recorded yet.');
    expect(context).toContain('diabetic');
    expect(context).toContain('wheelchair');
    expect(context).toContain('vegetarian');
  });

  it('should return "no preferences" for new user', () => {
    const context = userMemory.toContextString('new-user-2');
    expect(context).toBe('No persistent preferences recorded yet.');
  });

  it('should mark facilities as visited', () => {
    userMemory.markFacilityVisited(testUserId, 'Washroom C6');
    const mem = userMemory.get(testUserId);
    expect(mem.visitedFacilities).toContain('Washroom C6');
  });

  it('should not duplicate visited facilities', () => {
    userMemory.markFacilityVisited(testUserId, 'Washroom C6');
    const mem = userMemory.get(testUserId);
    const count = mem.visitedFacilities.filter(v => v === 'Washroom C6').length;
    expect(count).toBe(1);
  });

  it('should convert memory to string and update timestamp', () => {
    const mem = userMemory.get(testUserId);
    const created = mem.lastUpdated;
    userMemory.updateFromQuery(testUserId, 'I am thirsty');
    const mem2 = userMemory.get(testUserId);
    expect(mem2.lastUpdated.getTime()).toBeGreaterThanOrEqual(created.getTime());
  });

  it('should include facility and dietary info in context string', () => {
    userMemory.updateFromQuery(testUserId, 'I am vegan');
    userMemory.updateFromQuery(testUserId, 'always avoid Gate A', 'en');
    const context = userMemory.toContextString(testUserId);
    expect(context).toContain('vegan');
  });
});
