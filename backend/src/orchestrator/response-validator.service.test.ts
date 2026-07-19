import { ResponseValidatorService } from './response-validator.service';

describe('ResponseValidatorService', () => {
  const service = new ResponseValidatorService();

  describe('validate()', () => {
    it('should validate a correct response', () => {
      const raw = {
        text: JSON.stringify({
          recommendation: 'Head to Restroom C4',
          reasoning: { why: 'Nearest facility', evidence: ['GPS'], alternatives: [] },
          confidence: { score: 0.9, explanation: 'GPS fresh' },
        }),
        modelUsed: 'gemini',
        latencyMs: 100,
        tokenUsage: { prompt: 100, completion: 50, total: 150 },
      };
      const result = service.validate(raw, 'test-1');
      expect(result.isValid).toBe(true);
      expect(result.recommendation).toBe('Head to Restroom C4');
    });

    it('should reject non-JSON text', () => {
      const raw = {
        text: 'This is not JSON at all',
        modelUsed: 'gemini',
        latencyMs: 100,
        tokenUsage: { prompt: 100, completion: 50, total: 150 },
      };
      const result = service.validate(raw, 'test-2');
      expect(result.isValid).toBe(false);
    });

    it('should reject JSON with missing required fields', () => {
      const raw = {
        text: JSON.stringify({ recommendation: 'Hello' }),
        modelUsed: 'gemini',
        latencyMs: 100,
        tokenUsage: { prompt: 100, completion: 50, total: 150 },
      };
      const result = service.validate(raw, 'test-3');
      expect(result.isValid).toBe(false);
    });

    it('should extract JSON from markdown code fences', () => {
      const raw = {
        text: '```json\n' + JSON.stringify({
          recommendation: 'Go to Gate B',
          reasoning: { why: 'Shortest route', evidence: ['crowd data'], alternatives: [] },
        }) + '\n```',
        modelUsed: 'gemini',
        latencyMs: 100,
        tokenUsage: { prompt: 100, completion: 50, total: 150 },
      };
      const result = service.validate(raw, 'test-4');
      expect(result.isValid).toBe(true);
    });

    it('should reject confidence below 0.2', () => {
      const raw = {
        text: JSON.stringify({
          recommendation: 'Go somewhere',
          reasoning: { why: 'Unknown', evidence: [], alternatives: [] },
          confidence: { score: 0.1, explanation: 'Very low confidence' },
        }),
        modelUsed: 'gemini',
        latencyMs: 100,
        tokenUsage: { prompt: 100, completion: 50, total: 150 },
      };
      const result = service.validate(raw, 'test-5');
      expect(result.isValid).toBe(false);
    });
  });

  describe('parseStructured()', () => {
    it('should parse valid JSON', () => {
      const raw = {
        text: JSON.stringify({
          recommendation: 'Test',
          reasoning: { why: 'Because', evidence: [], alternatives: [] },
        }),
        modelUsed: 'gemini',
        latencyMs: 100,
        tokenUsage: { prompt: 100, completion: 50, total: 150 },
      };
      const result = service.parseStructured(raw);
      expect(result).not.toBeNull();
      expect(result!.recommendation).toBe('Test');
    });

    it('should return null for invalid JSON', () => {
      const raw = {
        text: 'not json',
        modelUsed: 'gemini',
        latencyMs: 100,
        tokenUsage: { prompt: 100, completion: 50, total: 150 },
      };
      const result = service.parseStructured(raw);
      expect(result).toBeNull();
    });
  });
});
