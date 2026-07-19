import {
  KnowledgeChunk,
  OrchestratorOutput,
  ReasoningOutput,
  ConfidenceOutput,
  ActionCard,
  PipelineStage,
} from '../../orchestrator/orchestrator.types';

export interface ChatResponse {
  success: true;
  data: {
    response: string;
    actions: ActionCard[];
    reasoning: ReasoningOutput;
    confidence: ConfidenceOutput;
    intent: string;
    agentUsed: string;
    sources: SourceDocument[];
    requestId: string;
    processingTimeMs: number;
    pipelineStages?: PipelineStage[];
    extractedConstraints?: string;
    userMemoryApplied?: boolean;
    plan?: any;
  };
}

export interface SourceDocument {
  title: string;
  documentType: string;
  relevanceScore: number;
}

export const mapOrchestratorToResponse = (output: OrchestratorOutput): ChatResponse => ({
  success: true,
  data: {
    response: output.recommendation,
    actions: output.actions,
    reasoning: output.reasoning,
    confidence: output.confidence,
    intent: output.intent,
    agentUsed: output.agentUsed,
    sources: output.supportingDocuments.map((doc: KnowledgeChunk): SourceDocument => ({
      title: doc.title,
      documentType: doc.documentType,
      relevanceScore: doc.relevanceScore,
    })),
    requestId: output.requestId,
    processingTimeMs: output.processingTimeMs,
    pipelineStages: output.pipelineStages,
    extractedConstraints: output.extractedConstraints,
    userMemoryApplied: output.userMemoryApplied,
    plan: output.plan,
  },
});
