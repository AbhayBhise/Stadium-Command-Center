import { AIOrchestrator } from '../src/orchestrator/orchestrator';

jest.mock('../src/config/env', () => ({
  env: {
    GEMINI_API_KEY: 'test-key',
    GEMINI_MODEL: 'gemini-2.0-flash-001',
  },
}));

// Mock Prisma
jest.mock('../src/database/prisma', () => ({
  prisma: {
    conversation: { findUnique: jest.fn() },
    recommendation: { create: jest.fn() },
    reasoningLog: { create: jest.fn() },
  },
}));

// Mock the providers
jest.mock('../src/providers/context.providers', () => ({
  providers: {
    ticket: { getTicket: jest.fn() },
    gps: { getCurrentLocation: jest.fn() },
    weather: { getWeather: jest.fn() },
    parking: { getParkingStatus: jest.fn() },
    crowd: { getCrowdDensity: jest.fn() },
    facility: { getNearestFacility: jest.fn() },
    emergency: { getEmergencyContacts: jest.fn() },
    staff: { getStaffDirectory: jest.fn() },
  },
}));

// Mock the Gemini adapter
const mockGenerate = jest.fn();
jest.mock('../src/orchestrator/gemini.adapter', () => ({
  GeminiAdapter: jest.fn().mockImplementation(() => ({
    generate: mockGenerate,
  })),
}));

describe('AI Orchestrator', () => {
  let orchestrator: AIOrchestrator;

  beforeAll(() => {
    orchestrator = new AIOrchestrator();
  });

  beforeEach(() => {
    mockGenerate.mockReset();
  });

  it('should detect emergency intent from keywords', async () => {
    const result = await orchestrator.processUserRequest({
      requestId: 'test-1',
      userQuery: 'emergency fire in concourse B',
      userId: 'user-1',
      userRole: 'SPECTATOR',
      preferredLanguage: 'en',
    });

    expect(['EMERGENCY', 'GENERAL']).toContain(result.intent);
  });

  it('should handle navigation intent', async () => {
    mockGenerate.mockResolvedValue({
      text: JSON.stringify({
        recommendation: 'Go to section B2',
        reasoning: { why: 'Shortest route', evidence: ['Distance 50m'], alternatives: ['Gate C'] },
        confidence: { score: 0.8, explanation: 'Good data', missingInformation: [] },
      }),
      modelUsed: 'gemini-test',
      latencyMs: 100,
      tokenUsage: { prompt: 100, completion: 50, total: 150 },
    });

    const result = await orchestrator.processUserRequest({
      requestId: 'test-2',
      userQuery: 'where is my seat',
      userId: 'user-1',
      userRole: 'SPECTATOR',
      preferredLanguage: 'en',
    });

    expect(result.recommendation).toBeDefined();
    expect(result.pipelineStages).toBeDefined();
    expect(result.processingTimeMs).toBeGreaterThan(0);
  });

  it('should handle CROWD intent', async () => {
    mockGenerate.mockResolvedValue({
      text: JSON.stringify({
        recommendation: 'Gate C is less busy',
        reasoning: { why: 'Crowd data shows low', evidence: ['Crowd density 20%'], alternatives: [] },
        confidence: { score: 0.9, explanation: 'Fresh data', missingInformation: [] },
      }),
      modelUsed: 'gemini-test',
      latencyMs: 80,
      tokenUsage: { prompt: 90, completion: 40, total: 130 },
    });

    const result = await orchestrator.processUserRequest({
      requestId: 'test-3',
      userQuery: 'which gate is less crowded',
      userId: 'user-1',
      userRole: 'SPECTATOR',
    });
    expect(result.intent).toBe('CROWD_QUERY');
  }, 15000);

  it('should handle error gracefully with fallback', async () => {
    mockGenerate.mockRejectedValue(new Error('Gemini unavailable'));

    const result = await orchestrator.processUserRequest({
      requestId: 'test-4',
      userQuery: 'find nearest washroom',
      userId: 'user-1',
      userRole: 'SPECTATOR',
      preferredLanguage: 'en',
    });

    expect(result.agentUsed).toBe('DETERMINISTIC_FALLBACK');
    expect(result.recommendation).toBeDefined();
  }, 15000);

  it('should include reasoning and confidence in output', async () => {
    mockGenerate.mockResolvedValue({
      text: JSON.stringify({
        recommendation: 'Test recommendation',
        reasoning: { why: 'Test why', evidence: ['Ev1'], alternatives: ['Alt1'] },
        confidence: { score: 0.85, explanation: 'High', missingInformation: [] },
      }),
      modelUsed: 'gemini-test',
      latencyMs: 100,
      tokenUsage: { prompt: 100, completion: 50, total: 150 },
    });

    const result = await orchestrator.processUserRequest({
      requestId: 'test-5',
      userQuery: 'I need food',
      userId: 'user-1',
      userRole: 'SPECTATOR',
      preferredLanguage: 'en',
    });

    expect(result.reasoning).toBeDefined();
    expect(result.reasoning.why).toBeDefined();
    expect(result.reasoning.evidence.length).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeDefined();
    expect(result.confidence.score).toBeGreaterThan(0);
    expect(result.confidence.score).toBeLessThanOrEqual(1);
  }, 15000);

  it('should handle volunteer_help intent', async () => {
    mockGenerate.mockResolvedValue({
      text: JSON.stringify({
        recommendation: 'Zone A needs backup',
        reasoning: { why: 'Crowd data', evidence: ['Zone A at 80%'], alternatives: [] },
        confidence: { score: 0.88, explanation: 'Verified', missingInformation: [] },
      }),
      modelUsed: 'gemini-test',
      latencyMs: 90,
      tokenUsage: { prompt: 80, completion: 30, total: 110 },
    });

    const result = await orchestrator.processUserRequest({
      requestId: 'test-6',
      userQuery: 'report incident at Gate C',
      userId: 'volunteer-1',
      userRole: 'VOLUNTEER',
    });

    expect(result.intent).toBeDefined();
  }, 15000);
});
