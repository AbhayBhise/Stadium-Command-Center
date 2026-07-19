import { IntentDetectionService } from './intent-detection.service';

describe('IntentDetectionService', () => {
  const service = new IntentDetectionService();

  describe('EMERGENCY intent', () => {
    it('should detect emergency keyword', () => {
      const result = service.detect('I need emergency help');
      expect(result.intent).toBe('EMERGENCY');
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should detect fire', () => {
      const result = service.detect('There is a fire');
      expect(result.intent).toBe('EMERGENCY');
    });

    it('should detect lost child', () => {
      const result = service.detect('I lost my child');
      expect(result.intent).toBe('EMERGENCY');
    });

    it('should detect medical emergency', () => {
      const result = service.detect('I need medical help immediately');
      expect(result.intent).toBe('EMERGENCY');
    });
  });

  describe('NAVIGATION intent', () => {
    it('should detect navigation queries', () => {
      const result = service.detect('Where is my seat?');
      expect(result.intent).toBe('NAVIGATION');
    });

    it('should detect gate navigation', () => {
      const result = service.detect('How do I get to Gate 6?');
      expect(result.intent).toBe('NAVIGATION');
    });

    it('should detect exit navigation', () => {
      const result = service.detect('Find the nearest exit');
      expect(result.intent).toBe('NAVIGATION');
    });
  });

  describe('FACILITY_SEARCH intent', () => {
    it('should detect washroom query', () => {
      const result = service.detect('Where is the nearest washroom?');
      expect(result.intent).toBe('FACILITY_SEARCH');
    });

    it('should detect food query', () => {
      const result = service.detect('I want to eat something');
      expect(result.intent).toBe('FACILITY_SEARCH');
    });

    it('should detect water query', () => {
      const result = service.detect('Where can I get water?');
      expect(result.intent).toBe('FACILITY_SEARCH');
    });
  });

  describe('ACCESSIBILITY intent', () => {
    it('should detect wheelchair query', () => {
      const result = service.detect('I need wheelchair accessible route');
      expect(result.intent).toBe('ACCESSIBILITY');
    });
  });

  describe('PLANNING intent', () => {
    it('should detect planning query', () => {
      const result = service.detect('Plan my stadium visit');
      expect(result.intent).toBe('PLANNING');
    });

    it('should detect schedule query', () => {
      const result = service.detect('What is the schedule for today?');
      expect(result.intent).toBe('PLANNING');
    });
  });

  describe('CROWD_QUERY intent', () => {
    it('should detect crowd query', () => {
      const result = service.detect('How crowded is Gate 1?');
      expect(result.intent).toBe('CROWD_QUERY');
    });
  });

  describe('VOLUNTEER_HELP intent', () => {
    it('should detect volunteer query', () => {
      const result = service.detect('What is my volunteer duty?');
      expect(result.intent).toBe('VOLUNTEER_HELP');
    });
  });

  describe('GENERAL intent', () => {
    it('should return GENERAL for unrecognized queries', () => {
      const result = service.detect('Hello');
      expect(result.intent).toBe('GENERAL');
    });
  });
});
