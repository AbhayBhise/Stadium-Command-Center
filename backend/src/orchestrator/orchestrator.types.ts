// ─────────────────────────────────────────────────────────────────────────────
// AI Orchestrator — Shared Types
// Every stage of the pipeline communicates through these typed contracts.
// ─────────────────────────────────────────────────────────────────────────────

export type AgentType =
  | 'NAVIGATION'
  | 'ACCESSIBILITY'
  | 'CROWD'
  | 'VOLUNTEER'
  | 'PLANNER'
  | 'EMERGENCY'
  | 'EMERGENCY_DETERMINISTIC'
  | 'DETERMINISTIC_FALLBACK'
  | 'FACILITY'
  | 'CONTEXT_ENGINE_RULES'
  | 'GENERAL';

export type IntentType =
  | 'NAVIGATION'
  | 'CROWD_QUERY'
  | 'VOLUNTEER_HELP'
  | 'PLANNING'
  | 'ACCESSIBILITY'
  | 'EMERGENCY'
  | 'FACILITY_SEARCH'
  | 'TICKETS'
  | 'FAQ'
  | 'GENERAL';

// ── Input ─────────────────────────────────────────────────────────────────────

export interface OrchestratorInput {
  requestId: string;
  userQuery: string;
  userId: string;
  userRole: string;
  stadiumId?: string;
  eventId?: string;
  conversationId?: string;
  conversationHistory?: ConversationTurn[];
  accessibilityProfile?: Record<string, unknown>;
  preferredLanguage?: string;
  accessibilityNeeds?: string;
  image?: { data: string; mimeType: string };
}

export interface ConversationTurn {
  sender: 'USER' | 'AI';
  message: string;
  timestamp: Date;
}

// ── Pipeline Stages ───────────────────────────────────────────────────────────

export interface DetectedIntent {
  intent: IntentType;
  confidence: number;
  keywords: string[];
}

export interface ActionCard {
  type: string; // e.g. 'NAVIGATE', 'CALL', 'NOTIFY', 'SHARE_LOCATION'
  title: string;
  payload?: Record<string, unknown>;
}

export interface OrchestratorContext {
  stadiumName?: string;
  eventTitle?: string;
  eventStatus?: string;
  zones?: string[];
  facilities?: string[];
  recentConversation?: string;
  userAccessibilityNeeds?: string;

  // Live Telemetry (UserContext Unified Object)
  currentLocation?: Record<string, unknown>;
  ticket?: Record<string, unknown>;
  crowdDensity?: Record<string, unknown>;
  weather?: Record<string, unknown>;
  nearbyFacilities?: Record<string, unknown>[];
  emergencyContacts?: Record<string, unknown>;
  staffDirectory?: Record<string, unknown>;
  parking?: Record<string, unknown>;

  // Agentic Layer
  extractedConstraints?: {
    summary: string;
    avoidGates: string[];
    avoidAreas: string[];
    avoidStairs: boolean;
    preferAccessible: boolean;
    preferVegetarian: boolean;
    preferVegan: boolean;
    preferShortestQueue: boolean;
    diabetic: boolean;
    withChildren: boolean;
    withElderly: boolean;
    requiresWheelchair: boolean;
    urgency: string;
    viaLocations: string[];
    meetFriend?: string;
  };
  userMemory?: string; // serialized memory context string for Gemini
}

export interface RetrievedKnowledge {
  documents: KnowledgeChunk[];
  retrievalDurationMs: number;
}

export interface KnowledgeChunk {
  id: string;
  title: string;
  content: string;
  documentType: string;
  relevanceScore: number;
}

export interface BuiltPrompt {
  systemPrompt: string;
  userPrompt: string;
  agentType: AgentType;
  promptVersion: string;
  image?: { data: string; mimeType: string };
}

export interface RawAIResponse {
  text: string;
  modelUsed: string;
  latencyMs: number;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface ValidatedResponse {
  recommendation: string;
  isValid: boolean;
  validationNotes?: string[];
  reasoning?: ReasoningOutput;
  confidence?: ConfidenceOutput;
  plan?: AgenticPlanStep[];
  actions?: ActionCard[];
}

export interface ReasoningOutput {
  why: string;
  evidence: string[];
  alternatives: string[];
  tradeoffs?: string;
}

export interface AgenticPlanStep {
  step: number;
  action: string;
  description: string;
}

export interface ConfidenceOutput {
  score: number; // 0.0 - 1.0
  explanation: string;
  missingInformation: string[];
  toolReliability: Record<string, string>;
}

// ── Final Output ──────────────────────────────────────────────────────────────

export interface OrchestratorOutput {
  requestId: string;
  intent: IntentType;
  agentUsed: AgentType;
  recommendation: string;
  actions: ActionCard[];
  reasoning: ReasoningOutput;
  confidence: ConfidenceOutput;
  supportingDocuments: KnowledgeChunk[];
  processingTimeMs: number;
  modelUsed: string;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
  // Agentic pipeline metadata (shown in AI Ops Center)
  pipelineStages?: PipelineStage[];
  extractedConstraints?: string;
  userMemoryApplied?: boolean;
  plan?: AgenticPlanStep[];
}

export interface PipelineStage {
  stage: string;
  status: 'OK' | 'WARN' | 'SKIP';
  durationMs: number;
  detail: string;
}

export interface ParsedAIData {
  confidence?: {
    score?: number;
    explanation?: string;
    missingInformation?: string[];
    toolReliability?: Record<string, string>;
  };
  reasoning?: { why?: string; evidence?: string[]; alternatives?: string[]; tradeoffs?: string };
}
