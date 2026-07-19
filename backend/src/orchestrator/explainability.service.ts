// ─────────────────────────────────────────────────────────────────────────────
// Stage 7 + 8: Reasoning Generator + Confidence Engine
// Extracts structured reasoning and confidence from parsed AI output.
// These are separate conceptual stages kept in one service for cohesion
// since both read from the already-parsed structured response.
// ─────────────────────────────────────────────────────────────────────────────

import {
  KnowledgeChunk,
  ReasoningOutput,
  ConfidenceOutput,
  ParsedAIData,
} from './orchestrator.types';

export class ExplainabilityService {
  buildReasoning(parsed: ParsedAIData, knowledgeDocs: KnowledgeChunk[]): ReasoningOutput {
    const topDocs = knowledgeDocs
      .filter((d) => d.relevanceScore > 0.1)
      .map((d) => `[${d.documentType}] ${d.title}`);

    return {
      why: parsed.reasoning?.why ?? 'Synthesized directly from context and intent models.',
      evidence: [...(parsed.reasoning?.evidence ?? []), ...topDocs].slice(0, 5),
      alternatives: parsed.reasoning?.alternatives ?? [],
      tradeoffs: parsed.reasoning?.tradeoffs,
    };
  }

  buildConfidence(parsed: ParsedAIData, knowledgeDocs: KnowledgeChunk[]): ConfidenceOutput {
    let score = parsed.confidence?.score ?? 1.0;

    // Adjust confidence down if no knowledge docs were available
    if (knowledgeDocs.length === 0) {
      score = Math.max(score - 0.15, 0.1);
    }

    // Adjust confidence down if all docs had low relevance
    const avgRelevance =
      knowledgeDocs.length > 0
        ? knowledgeDocs.reduce((sum, d) => sum + d.relevanceScore, 0) / knowledgeDocs.length
        : 0;

    if (avgRelevance < 0.2 && knowledgeDocs.length > 0) {
      score = Math.max(score - 0.1, 0.1);
    }

    const explanationStr = parsed.confidence?.explanation ?? 'Fully verified context';
    const missingInformation = parsed.confidence?.missingInformation || [];
    const toolReliability = parsed.confidence?.toolReliability || {};

    return {
      score: Math.round(score * 100) / 100,
      explanation: explanationStr,
      missingInformation: missingInformation,
      toolReliability: toolReliability,
    };
  }
}
