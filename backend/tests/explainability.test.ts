import { ExplainabilityService } from '../src/orchestrator/explainability.service';

describe('ExplainabilityService', () => {
  const service = new ExplainabilityService();

  it('should build reasoning from parsed data and knowledge docs', () => {
    const parsed = {
      confidence: { score: 0.8, explanation: 'Test' },
      reasoning: { why: 'Shortest path', evidence: ['Tool returned 50m'], alternatives: ['Gate B'], tradeoffs: 'More walking but less crowd' },
    };
    const docs = [
      { id: '1', title: 'Gate A', content: 'Crowd low', documentType: 'Gate', relevanceScore: 0.9 },
    ];

    const reasoning = service.buildReasoning(parsed, docs);
    expect(reasoning.why).toBe('Shortest path');
    expect(reasoning.evidence).toContain('Tool returned 50m');
    expect(reasoning.evidence).toContain('[Gate] Gate A');
    expect(reasoning.alternatives).toContain('Gate B');
    expect(reasoning.tradeoffs).toBe('More walking but less crowd');
  });

  it('should use fallback reasoning when parsed has none', () => {
    const parsed = { confidence: { score: 0.9, explanation: 'Test' } };
    const docs: any[] = [];

    const reasoning = service.buildReasoning(parsed as any, docs);
    expect(reasoning.why).toBe('Synthesized directly from context and intent models.');
    expect(reasoning.evidence).toEqual([]);
    expect(reasoning.alternatives).toEqual([]);
  });

  it('should filter low relevance docs from evidence', () => {
    const parsed = {
      confidence: { score: 0.7, explanation: 'Test' },
      reasoning: { why: 'Test why', evidence: [], alternatives: [] },
    };
    const docs = [
      { id: '1', title: 'Low', content: 'Low', documentType: 'Test', relevanceScore: 0.05 },
      { id: '2', title: 'High', content: 'High', documentType: 'Test', relevanceScore: 0.8 },
    ];

    const reasoning = service.buildReasoning(parsed, docs);
    expect(reasoning.evidence.length).toBe(1);
    expect(reasoning.evidence[0]).toContain('High');
  });

  it('should build confidence score from parsed data', () => {
    const parsed = {
      confidence: { score: 0.85, explanation: 'Recent data', missingInformation: ['Weather'], toolReliability: { gps: 'fresh' } },
    };
    const docs: any[] = [{ id: '1', title: 'Doc', content: '', documentType: 'Type', relevanceScore: 0.8 }];

    const confidence = service.buildConfidence(parsed, docs);
    expect(confidence.score).toBeCloseTo(0.85, 1);
    expect(confidence.explanation).toBe('Recent data');
    expect(confidence.missingInformation).toContain('Weather');
    expect(confidence.toolReliability.gps).toBe('fresh');
  });

  it('should reduce confidence when no knowledge docs available', () => {
    const parsed = { confidence: { score: 1.0, explanation: 'Perfect' } };
    const docs: any[] = [];

    const confidence = service.buildConfidence(parsed, docs);
    expect(confidence.score).toBeLessThan(0.9);
  });

  it('should reduce confidence when docs have low avg relevance', () => {
    const parsed = { confidence: { score: 0.8, explanation: 'High' } };
    const docs = [
      { id: '1', title: 'D', content: '', documentType: 'T', relevanceScore: 0.1 },
      { id: '2', title: 'E', content: '', documentType: 'T', relevanceScore: 0.05 },
    ];

    const confidence = service.buildConfidence(parsed, docs);
    expect(confidence.score).toBeLessThan(0.75);
  });

  it('should handle missing parsed confidence gracefully', () => {
    const parsed: any = {};
    const docs: any[] = [];

    const reasoning = service.buildReasoning(parsed, docs);
    expect(reasoning.why).toBe('Synthesized directly from context and intent models.');
  });
});
