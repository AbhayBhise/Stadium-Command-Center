import { ConstraintExtractorService } from './constraint-extractor.service';

describe('ConstraintExtractorService', () => {
  const service = new ConstraintExtractorService();

  describe('gate avoidance', () => {
    it('should extract gate to avoid', () => {
      const result = service.extract('Avoid Gate 6');
      expect(result.avoidGates.length).toBeGreaterThan(0);
    });

    it('should extract multiple gates', () => {
      const result = service.extract('Avoid Gate 6 and Gate 3');
      expect(result.avoidGates.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('stair avoidance', () => {
    it('should detect no stairs preference', () => {
      const result = service.extract('Avoid stairs');
      expect(result.avoidStairs).toBe(true);
    });

    it('should detect step-free preference', () => {
      const result = service.extract('I need a step-free route');
      expect(result.avoidStairs).toBe(true);
    });
  });

  describe('crowd avoidance', () => {
    it('should detect crowd avoidance', () => {
      const result = service.extract('Avoid crowded areas');
      expect(result.avoidCrowds).toBe(true);
    });
  });

  describe('accessibility', () => {
    it('should detect wheelchair need', () => {
      const result = service.extract('I am in a wheelchair');
      expect(result.preferAccessible).toBe(true);
      expect(result.requiresWheelchair).toBe(true);
    });
  });

  describe('dietary preferences', () => {
    it('should detect vegetarian', () => {
      const result = service.extract('I am vegetarian');
      expect(result.preferVegetarian).toBe(true);
    });

    it('should detect vegan', () => {
      const result = service.extract('I am vegan');
      expect(result.preferVegan).toBe(true);
    });
  });

  describe('meet friend', () => {
    it('should extract meet friend location', () => {
      const result = service.extract('Meet my friend near Gate B');
      expect(result.meetFriend).toBeDefined();
    });
  });

  describe('urgency', () => {
    it('should detect high urgency', () => {
      const result = service.extract('I need help immediately');
      expect(result.urgency).toBe('HIGH');
    });

    it('should detect medium urgency', () => {
      const result = service.extract('I need to get there before kickoff');
      expect(result.urgency).toBe('MEDIUM');
    });

    it('should default to low urgency', () => {
      const result = service.extract('Where is the restroom?');
      expect(result.urgency).toBe('LOW');
    });
  });

  describe('family', () => {
    it('should detect children', () => {
      const result = service.extract('I am with my kids');
      expect(result.withChildren).toBe(true);
    });
  });

  describe('via waypoints', () => {
    it('should extract via locations', () => {
      const result = service.extract('Take me to my seat via the merchandise store');
      expect(result.viaLocations.length).toBeGreaterThan(0);
    });
  });

  describe('summary', () => {
    it('should generate a summary', () => {
      const result = service.extract('Avoid Gate 6, I am vegetarian');
      expect(result.summary.length).toBeGreaterThan(0);
    });

    it('should say no constraints when none detected', () => {
      const result = service.extract('Hello');
      expect(result.summary).toContain('No specific constraints');
    });
  });
});
