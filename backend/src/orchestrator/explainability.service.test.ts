import { ExplainabilityService } from './explainability.service';

describe('ExplainabilityService', () => {
  const service = new ExplainabilityService();

  describe('buildReasoning()', () => {
    it('should build reasoning from parsed data', () => {
      const parsed = {
        reasoning: {
          why: 'Nearest restroom with low crowd',
          evidence: ['GPS shows current location', 'Crowd data shows C6 is quiet'],
          alternatives: ['C4 was crowded', 'C8 is farther'],
          tradeoffs: 'C6 is 20m farther but saves 8 minutes in queue',
        },
      };
      const result = service.buildReasoning(parsed, []);
      expect(result.why).toBe('Nearest restroom with low crowd');
      expect(result.evidence.length).toBe(2);
      expect(result.alternatives.length).toBe(2);
      expect(result.tradeoffs).toContain('20m farther');
    });

    it('should handle missing reasoning gracefully', () => {
      const parsed = {};
      const result = service.buildReasoning(parsed, []);
      expect(result.why).toBeTruthy();
      expect(result.evidence).toEqual([]);
    });

    it('should include knowledge docs as evidence', () => {
      const parsed = { reasoning: { why: 'test', evidence: [], alternatives: [] } };
      const docs = [
        { id: '1', title: 'Emergency SOP', content: '', documentType: 'Emergency SOP', relevanceScore: 0.5 },
      ];
      const result = service.buildReasoning(parsed, docs);
      expect(result.evidence.some(e => e.includes('Emergency SOP'))).toBe(true);
    });
  });

  describe('buildConfidence()', () => {
    it('should build confidence from parsed data', () => {
      const parsed = {
        confidence: {
          score: 0.85,
          explanation: 'GPS fresh, ticket verified',
          missingInformation: [],
          toolReliability: { gps: 'fresh', ticket: 'verified' },
        },
      };
      const result = service.buildConfidence(parsed, []);
      expect(result.score).toBe(0.7);
      expect(result.explanation).toContain('GPS');
    });

    it('should reduce confidence when no docs', () => {
      const parsed = { confidence: { score: 0.9, explanation: 'test' } };
      const result = service.buildConfidence(parsed, []);
      expect(result.score).toBeLessThan(0.9);
    });

    it('should default score to 1.0 when missing', () => {
      const parsed = {};
      const result = service.buildConfidence(parsed, []);
      expect(result.score).toBeGreaterThan(0);
    });
  });
});
