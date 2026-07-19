import { ResponseValidatorService } from '../src/orchestrator/response-validator.service';

describe('ResponseValidatorService', () => {
  const validator = new ResponseValidatorService();

  const validRawResponse = {
    text: JSON.stringify({
      recommendation: 'Go to Gate A, it has the shortest queue.',
      plan: [
        { step: 1, action: 'Walk to Gate A', description: '50 meters straight' },
      ],
      actions: [
        { type: 'NAVIGATE', title: 'Navigate to Gate A', payload: { destination: 'Gate A' } }
      ],
      reasoning: {
        why: 'Gate A has the lowest wait time due to low crowd density.',
        evidence: ['Crowd levels at Gate A: 20%'],
        alternatives: ['Gate B would be 80m longer but equally clear.'],
        tradeoffs: 'Gate A is closest and least crowded.'
      },
      confidence: {
        score: 0.9,
        explanation: 'Recent crowd telemetry provides high accuracy.',
        missingInformation: [],
        toolReliability: { gps: 'fresh', crowd: 'fresh' }
      }
    }),
    modelUsed: 'gemini-2.0-flash',
    latencyMs: 1000,
    tokenUsage: { prompt: 100, completion: 50, total: 150 }
  };

  it('should validate a correct response', () => {
    const result = validator.validate(validRawResponse, 'test-1');
    expect(result.isValid).toBe(true);
    expect(result.recommendation).toBe('Go to Gate A, it has the shortest queue.');
    expect(result.plan).toBeDefined();
    expect(result.plan!.length).toBe(1);
    expect(result.plan![0].step).toBe(1);
    expect(result.actions).toBeDefined();
    expect(result.actions!.length).toBe(1);
    expect(result.actions![0].type).toBe('NAVIGATE');
  });

  it('should return invalid for non-JSON response', () => {
    const raw = { ...validRawResponse, text: 'Just some plain text without JSON' };
    const result = validator.validate(raw, 'test-2');
    expect(result.isValid).toBe(false);
    expect(result.validationNotes).toContain('No JSON found in response');
  });

  it('should handle malformed JSON', () => {
    const raw = { ...validRawResponse, text: 'Not even close to JSON {{{' };
    const result = validator.validate(raw, 'test-3');
    expect(result.isValid).toBe(false);
    expect(result.validationNotes).toContain('No JSON found in response');
  });

  it('should detect missing required fields', () => {
    const incompleteRaw = { ...validRawResponse, text: JSON.stringify({ recommendation: 'test' }) };
    const result = validator.validate(incompleteRaw, 'test-4');
    expect(result.isValid).toBe(false);
    expect(result.validationNotes!.length).toBeGreaterThan(0);
  });

  it('should flag safety blocklist phrases', () => {
    const unsafeRaw = { ...validRawResponse, text: JSON.stringify({ ...JSON.parse(validRawResponse.text), recommendation: 'I cannot help with that request.' }) };
    const result = validator.validate(unsafeRaw, 'test-5');
    expect(result.isValid).toBe(false);
    expect(result.validationNotes).toBeDefined();
  });

  it('should flag low confidence scores', () => {
    const lowConfRaw = { ...validRawResponse, text: JSON.stringify({ ...JSON.parse(validRawResponse.text), confidence: { score: 0.1, explanation: 'Very low' } }) };
    const result = validator.validate(lowConfRaw, 'test-6');
    expect(result.isValid).toBe(false);
    expect(result.validationNotes!.some(n => n.includes('extremely low'))).toBe(true);
  });

  it('should parse structured JSON from markdown fences', () => {
    const fencedText = '```json\n' + validRawResponse.text + '\n```';
    const raw = { ...validRawResponse, text: fencedText };
    const result = validator.validate(raw, 'test-7');
    expect(result.isValid).toBe(true);
    expect(result.recommendation).toBe('Go to Gate A, it has the shortest queue.');
  });

  it('should return null for parseStructured on non-JSON', () => {
    const raw = { ...validRawResponse, text: 'no json here' };
    const result = validator.parseStructured(raw);
    expect(result).toBeNull();
  });

  it('should parse structured successfully with valid JSON', () => {
    const result = validator.parseStructured(validRawResponse);
    expect(result).not.toBeNull();
    expect(result!.recommendation).toBe('Go to Gate A, it has the shortest queue.');
    expect(result!.reasoning.why).toBeDefined();
  });
});
