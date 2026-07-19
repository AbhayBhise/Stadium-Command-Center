import { IntentDetectionService } from '../src/orchestrator/intent-detection.service';

describe('IntentDetectionService', () => {
  const detector = new IntentDetectionService();

  it('should detect EMERGENCY from keywords', () => {
    const result = detector.detect('There is an emergency fire near Gate A');
    expect(result.intent).toBe('EMERGENCY');
    expect(result.keywords).toContain('emergency');
    expect(result.keywords).toContain('fire');
  });

  it('should detect LOST CHILD as EMERGENCY', () => {
    const result = detector.detect('I lost my child');
    expect(result.intent).toBe('EMERGENCY');
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it('should detect NAVIGATION intent', () => {
    const result = detector.detect('Where is my seat?');
    expect(result.intent).toBe('NAVIGATION');
    expect(result.keywords).toContain('where');
  });

  it('should detect CROWD_QUERY', () => {
    const result = detector.detect('Is it busy at Gate C?');
    expect(result.intent).toBe('CROWD_QUERY');
    expect(result.keywords).toContain('busy');
  });

  it('should detect FACILITY_SEARCH', () => {
    const result = detector.detect('Where is the nearest washroom?');
    expect(result.intent).toBe('FACILITY_SEARCH');
  });

  it('should detect ACCESSIBILITY', () => {
    const result = detector.detect('Is there a wheelchair accessible route?');
    expect(result.intent).toBe('ACCESSIBILITY');
  });

  it('should detect VOLUNTEER_HELP', () => {
    const result = detector.detect('Need volunteer assistance at Zone A');
    expect(result.intent).toBe('VOLUNTEER_HELP');
    expect(result.keywords).toContain('volunteer');
  });

  it('should detect PLANNING', () => {
    const result = detector.detect('What time should I arrive before kickoff?');
    expect(result.intent).toBe('PLANNING');
  });

  it('should return GENERAL for unknown queries', () => {
    const result = detector.detect('What is the capital of France?');
    expect(result.intent).toBe('GENERAL');
    expect(result.confidence).toBe(0.4);
  });

  it('should prioritize EMERGENCY over all other intents', () => {
    const result = detector.detect('Help I need fire emergency but also where is my seat');
    expect(result.intent).toBe('EMERGENCY');
    expect(result.keywords.length).toBeGreaterThanOrEqual(2);
  });

  it('should CROWD_QUERY beat NAVIGATION when crowd words dominate', () => {
    const result = detector.detect('Is the concourse crowded?');
    expect(result.intent).toBe('CROWD_QUERY');
  });

  it('should keep confidence <= 0.95 for non-emergency queries', () => {
    const tests = [
      'Where is the washroom?',
      'I have a wheelchair',
      'What time is kickoff?',
    ];
    for (const t of tests) {
      const result = detector.detect(t);
      expect(result.confidence).toBeGreaterThanOrEqual(0.4);
      expect(result.confidence).toBeLessThanOrEqual(0.95);
    }
  });

  it('should extract multiple keywords from highest scoring intent', () => {
    const result = detector.detect('Find the nearest accessible elevator');
    expect(result.intent).toBe('ACCESSIBILITY');
    expect(result.keywords.length).toBeGreaterThanOrEqual(2);
    expect(result.keywords).toContain('accessible');
    expect(result.keywords).toContain('elevator');
  });
});
