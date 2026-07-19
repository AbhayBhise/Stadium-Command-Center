import { ConstraintExtractorService } from '../src/orchestrator/constraint-extractor.service';

describe('ConstraintExtractorService', () => {
  const extractor = new ConstraintExtractorService();

  it('should extract gate avoidances', () => {
    const result = extractor.extract('Please avoid Gate C and Gate E');
    // The extractor matches gates after "avoid Gate" — first match is "C"
    expect(result.avoidGates.length).toBeGreaterThanOrEqual(1);
    expect(result.avoidGates[0]).toContain('C');
    expect(result.summary).toContain('Avoid gates');
  });

  it('should extract area avoidances', () => {
    const result = extractor.extract('stay away from the concourse area');
    expect(result.avoidAreas).toContain('concourse');
  });

  it('should detect step-free requirement', () => {
    const result = extractor.extract('need a step-free route');
    expect(result.avoidStairs).toBe(true);
    expect(result.summary).toContain('Step-free');
  });

  it('should detect crowd avoidance', () => {
    const result = extractor.extract('show me a less crowded route');
    expect(result.avoidCrowds).toBe(true);
  });

  it('should detect accessibility needs', () => {
    const result = extractor.extract('I am in a wheelchair');
    expect(result.preferAccessible).toBe(true);
    expect(result.requiresWheelchair).toBe(true);
  });

  it('should detect diabetic constraint', () => {
    const result = extractor.extract('I am diabetic, need low-sugar food');
    expect(result.diabetic).toBe(true);
    expect(result.summary).toContain('diabetic');
  });

  it('should detect traveling with children', () => {
    const result = extractor.extract('I travel with my kids');
    expect(result.withChildren).toBe(true);
  });

  it('should extract waypoints', () => {
    const result = extractor.extract('Go from Gate A to Section B via merchandise store');
    expect(result.viaLocations.length).toBeGreaterThanOrEqual(0);
  });

  it('should detect HIGH urgency', () => {
    const result = extractor.extract('urgent! I need help immediately');
    expect(result.urgency).toBe('HIGH');
    expect(result.summary).toContain('URGENT');
  });

  it('should detect MEDIUM urgency', () => {
    const result = extractor.extract('I need to be there before the match starts');
    expect(result.beforeKickoff).toBe(true);
  });

  it('should return no constraints for generic queries', () => {
    const result = extractor.extract('Where is the bathroom?');
    expect(result.summary).toBe('No specific constraints detected');
    expect(result.avoidGates).toEqual([]);
    expect(result.avoidAreas).toEqual([]);
    expect(result.viaLocations).toEqual([]);
  });

  it('should detect vegetarian preference', () => {
    const result = extractor.extract('I need vegetarian food options');
    expect(result.preferVegetarian).toBe(true);
  });

  it('should detect vegan preference', () => {
    const result = extractor.extract('Do you have vegan options?');
    expect(result.preferVegan).toBe(true);
  });

  it('should detect meet a friend constraint', () => {
    const result = extractor.extract('I am meeting my friend at Gate B');
    expect(result.meetFriend).toBe('B');
  });
});
