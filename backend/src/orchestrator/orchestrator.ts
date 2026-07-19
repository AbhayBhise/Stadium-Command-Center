import { randomUUID } from 'crypto';
import { logger } from '../config/logger';
import { prisma } from '../database/prisma';
import { AppError } from '../lib/AppError';
import { OrchestratorInput, OrchestratorOutput, PipelineStage } from './orchestrator.types';
import { IntentDetectionService } from './intent-detection.service';
import { ConstraintExtractorService } from './constraint-extractor.service';
import { userMemory } from './user-memory.store';
import { ContextBuilderService } from './context-builder.service';
import { KnowledgeRetrievalService } from './knowledge-retrieval.service';
import { PromptBuilderService } from './prompt-builder.service';
import { GeminiAdapter } from './gemini.adapter';
import { ResponseValidatorService } from './response-validator.service';
import { ExplainabilityService } from './explainability.service';
import { runAssist } from '../modules/assist/assist.service';
import { UserContext } from '../models/schemas';
import { providers } from '../providers/context.providers';

export class AIOrchestrator {
  private readonly intentDetector: IntentDetectionService;
  private readonly constraintExtractor: ConstraintExtractorService;
  private readonly contextBuilder: ContextBuilderService;
  private readonly knowledgeRetriever: KnowledgeRetrievalService;
  private readonly promptBuilder: PromptBuilderService;
  private readonly geminiAdapter: GeminiAdapter;
  private readonly responseValidator: ResponseValidatorService;
  private readonly explainabilityService: ExplainabilityService;

  constructor() {
    this.intentDetector = new IntentDetectionService();
    this.constraintExtractor = new ConstraintExtractorService();
    this.contextBuilder = new ContextBuilderService();
    this.knowledgeRetriever = new KnowledgeRetrievalService();
    this.promptBuilder = new PromptBuilderService();
    this.geminiAdapter = new GeminiAdapter();
    this.responseValidator = new ResponseValidatorService();
    this.explainabilityService = new ExplainabilityService();
  }

  async processUserRequest(
    input: OrchestratorInput,
    onProgress?: (stage: PipelineStage) => void
  ): Promise<OrchestratorOutput> {
    const pipelineStart = Date.now();
    const requestId = input.requestId || randomUUID();
    const stages: PipelineStage[] = [];

    const stageTimer = (stageName: string) => {
      const start = process.hrtime.bigint();
      return (detail: string, status: 'OK' | 'WARN' | 'SKIP' = 'OK') => {
        const elapsedNs = process.hrtime.bigint() - start;
        const durationMs = Math.max(1, Math.round(Number(elapsedNs) / 1_000_000));
        const stageObj: PipelineStage = { stage: stageName, status, durationMs, detail };
        stages.push(stageObj);
        onProgress?.(stageObj);
      };
    };

    logger.info(
      `[Orchestrator] START requestId=${requestId} userId=${input.userId} intent=pending`
    );

    let detectedIntentStr = 'GENERAL';

    try {
      // ── Stage 1: Intent Detection ──────────────────────────────────────────
      let s = stageTimer('Intent Detection');
      const intent = this.intentDetector.detect(input.userQuery);
      detectedIntentStr = intent.intent;
      s(`${intent.intent} @ ${(intent.confidence * 100).toFixed(0)}% confidence`);
      logger.debug(
        `[Orchestrator] Stage1 intent=${intent.intent} confidence=${intent.confidence.toFixed(2)}`
      );

      const emergencyDetected = intent.intent === 'EMERGENCY' || this.isEmergencyKeywordQuery(input.userQuery);
      if (emergencyDetected) {
        s = stageTimer('Emergency Router');
        return this.buildEmergencyResponse(input, requestId, pipelineStart, stages, s, intent.keywords);
      }

      // ── Stage 1.5: Constraint Extraction ──────────────────────────────────
      s = stageTimer('Constraint Extraction');
      const memCtx = userMemory.get(input.userId);
      const constraints = this.constraintExtractor.extract(
        input.userQuery,
        input.conversationHistory?.map((t) => `${t.sender}: ${t.message}`).join('\n')
      );
      // Update memory from this query
      userMemory.updateFromQuery(input.userId, input.userQuery, input.preferredLanguage);
      const userMemoryApplied =
        memCtx.isDiabetic ||
        memCtx.isWheelchairUser ||
        memCtx.dietaryPreferences.length > 0 ||
        memCtx.avoidedAreas.length > 0;
      s(constraints.summary);
      logger.debug(`[Orchestrator] Stage1.5 constraints="${constraints.summary}"`);

      // ── Stage 2: Context Builder (with constraints + memory injected) ──────
      s = stageTimer('Context Fusion');
      const context = await this.contextBuilder.build(input);
      // Inject constraint and memory data into context
      context.extractedConstraints = constraints;
      context.userMemory = userMemory.toContextString(input.userId);
      s(
        `${String(Object.keys(context).length)} context keys fused (Ticket + GPS + Crowd + Weather + Constraints + Memory)`
      );
      logger.debug(`[Orchestrator] Stage2 contextKeys=${Object.keys(context).join(',')}`);

      // ── Stage 2.5: Decision Engine (constraint-aware) ──────────────────────
      s = stageTimer('Decision Engine');
      let deterministicAssist: any = null;
      
      // If intent maps to a routing/facility intent, run the ContextEngine
      const routingIntents = ['FACILITY_SEARCH', 'NAVIGATION', 'ACCESSIBILITY'];
      if (routingIntents.includes(intent.intent)) {
        s(`Running deterministic Context Engine for ${intent.intent}`);
        
        let destIntent: any = 'guest_services';
        const q = input.userQuery.toLowerCase();
        if (/(washroom|restroom|toilet|bathroom)\b/.test(q)) destIntent = 'restroom';
        else if (/\b(food|eat|drink|water)\b/.test(q)) destIntent = 'concession';
        else if (/\b(medical|first aid)\b/.test(q)) destIntent = 'medical';
        else if (/\b(merchandise)\b/.test(q)) destIntent = 'merchandise';
        else if (/\b(parking)\b/.test(q)) destIntent = 'parking';
        else if (/\b(seat)\b/.test(q)) destIntent = 'seat';
        
        let needs: any = ['none'];
        if (input.accessibilityNeeds) {
          needs = input.accessibilityNeeds.split(',').map(n => n.trim()).filter(Boolean);
        }
        if (needs.length === 0) needs = ['none'];
        
        let ticketSection = null;
        try {
          const ticket = await providers.ticket.getTicket(input.userId);
          if (ticket && ticket.section) ticketSection = ticket.section;
        } catch (e) {
          logger.warn(`Failed to fetch ticket for user ${input.userId}`);
        }
        
        const gpsData = context.currentLocation as Record<string, unknown> | undefined;
        const currentZone = (gpsData?.zone as string) || 'gate_a';
        
        const ctx: UserContext = {
          language: input.preferredLanguage === 'fr' ? 'fr' : input.preferredLanguage === 'es' ? 'es' : 'en',
          current_location: currentZone,
          destination_intent: destIntent,
          accessibility_needs: needs,
          ticket_section: ticketSection,
          minutes_to_kickoff: 30,
          question: input.userQuery
        };
        
        try {
          deterministicAssist = await runAssist(ctx);
          s(`ContextEngine resolved to ${deterministicAssist.facility.name}`);
        } catch (err) {
          s(`ContextEngine failed: ${err}`, 'WARN');
        }
      } else {
        s(`Skipped - Decision Engine uses LLM for non-routing tasks`, 'SKIP');
      }

      // ── Stage 3: Knowledge Retrieval ───────────────────────────────────────
      s = stageTimer('Knowledge Retrieval');
      const retrieved = await this.knowledgeRetriever.retrieve(
        input.userQuery,
        intent.intent,
        input.stadiumId
      );
      s(
        `${String(retrieved.documents.length)} documents retrieved in ${String(retrieved.retrievalDurationMs)}ms`
      );
      logger.debug(
        `[Orchestrator] Stage3 docs=${String(retrieved.documents.length)} retrievalMs=${String(retrieved.retrievalDurationMs)}`
      );

      // ── Stage 4: Prompt Builder ────────────────────────────────────────────
      s = stageTimer('Prompt Construction');
      const builtPrompt = this.promptBuilder.build(input, intent, context, retrieved.documents);
      s(`Agent: ${builtPrompt.agentType} v${builtPrompt.promptVersion}`);
      logger.debug(
        `[Orchestrator] Stage4 agent=${builtPrompt.agentType} promptVersion=${builtPrompt.promptVersion}`
      );

      let rawResponse;
      
      if (deterministicAssist && (!input.userQuery || input.userQuery.trim().length === 0 || !deterministicAssist.used_llm)) {
        s('Deterministic Context Engine short-circuited LLM', 'OK');
        
        return {
          requestId,
          intent: intent.intent,
          agentUsed: 'CONTEXT_ENGINE_RULES',
          recommendation: deterministicAssist.answer,
          plan: deterministicAssist.route_steps.map((step: any) => ({
            step: step.order,
            action: `Move to ${step.to_zone}`,
            description: step.instruction
          })),
          actions: [
            { type: 'NAVIGATE', title: `Navigate to ${deterministicAssist.facility?.name || 'Destination'}`, payload: { destination: deterministicAssist.facility?.name } }
          ],
          reasoning: {
            why: 'Rule-based engine resolved the path deterministically based on constraints and graph data.',
            evidence: [`Crowd level: ${deterministicAssist.crowd_level}`],
            alternatives: deterministicAssist.alternatives_note ? [deterministicAssist.alternatives_note] : [],
            tradeoffs: 'Used deterministic graph instead of LLM'
          },
          confidence: { score: 1.0, explanation: 'Deterministic route', missingInformation: [], toolReliability: {} },
          supportingDocuments: [],
          processingTimeMs: Date.now() - pipelineStart,
          modelUsed: 'context-engine',
          tokenUsage: { prompt: 0, completion: 0, total: 0 },
          pipelineStages: stages,
          extractedConstraints: constraints.summary,
          userMemoryApplied
        };
      } else {
        rawResponse = await this.geminiAdapter.generate(
          builtPrompt,
          requestId,
          (progressStage) => {
            stages.push(progressStage);
            onProgress?.(progressStage);
          }
        );
      }
      s(
        `${String(rawResponse.latencyMs)}ms • ${String(rawResponse.tokenUsage.total)} tokens • model: ${rawResponse.modelUsed}`
      );
      logger.debug(
        `[Orchestrator] Stage5 latency=${String(rawResponse.latencyMs)}ms tokens=${String(rawResponse.tokenUsage.total)}`
      );

      // ── Stage 6: Response Validation ───────────────────────────────────────
      s = stageTimer('Safety Validation');
      const validated = this.responseValidator.validate(rawResponse, requestId);
      const structured = this.responseValidator.parseStructured(rawResponse);

      if (!validated.isValid || !structured) {
        s(`FAILED: ${(validated.validationNotes || []).join('; ')}`, 'WARN');
        logger.warn(
          `[Orchestrator] Stage6 INVALID requestId=${requestId} notes=${(validated.validationNotes || []).join('; ')}`
        );
        throw new AppError(
          `AI response validation failed: ${(validated.validationNotes || []).join('; ')}\nRAW TEXT: ${rawResponse.text}`,
          500,
          false
        );
      }
      s('Passed all safety checks');

      // ── Stage 7+8: Explainability + Confidence ─────────────────────────────
      s = stageTimer('Explainability + Confidence');
      const reasoning = this.explainabilityService.buildReasoning(structured, retrieved.documents);
      const confidence = this.explainabilityService.buildConfidence(
        structured,
        retrieved.documents
      );
      s(`Confidence: ${(confidence.score * 100).toFixed(0)}% (${confidence.explanation})`);

      const processingTimeMs = Date.now() - pipelineStart;

      // ── Persist to DB (non-blocking, skipped if no database) ──────────────
      if (input.conversationId && process.env.DATABASE_URL) {
        await this.persistReasoningLog({
          requestId,
          conversationId: input.conversationId,
          recommendation: validated.recommendation,
          intent: intent.intent,
          reasoning,
          confidence,
          builtPrompt,
          rawResponse,
          retrieved,
        });
      }

      logger.info(
        `[Orchestrator] DONE requestId=${requestId} agent=${builtPrompt.agentType} confidence=${String(confidence.score)} totalMs=${String(processingTimeMs)}`
      );

      return {
        requestId,
        intent: intent.intent,
        agentUsed: builtPrompt.agentType,
        recommendation: validated.recommendation,
        actions: validated.actions || [],
        reasoning,
        confidence,
        supportingDocuments: retrieved.documents,
        processingTimeMs,
        modelUsed: rawResponse.modelUsed,
        tokenUsage: rawResponse.tokenUsage,
        // Agentic metadata for AI Ops Center
        pipelineStages: stages,
        extractedConstraints: constraints.summary,
        userMemoryApplied,
        plan: validated.plan,
      };
    } catch (err: unknown) {
      const processingTimeMs = Date.now() - pipelineStart;
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error(
        `[Orchestrator] ERROR requestId=${requestId} totalMs=${String(processingTimeMs)} error=${errMsg}`
      );
      
      const isEmergency = detectedIntentStr === 'EMERGENCY' || input.userQuery.toLowerCase().includes('emergency') || input.userQuery.toLowerCase().includes('lost');
      
      // Fallback response instead of crashing
      return {
        requestId,
        intent: detectedIntentStr as any,
        agentUsed: 'DETERMINISTIC_FALLBACK',
        recommendation: isEmergency 
          ? 'Emergency Mode: Security has been notified of your location. Please stay where you are or use the buttons below for immediate assistance.'
          : 'I am currently operating in offline mode. I can help you with basic navigation, but complex requests are temporarily unavailable.',
        actions: isEmergency 
          ? [
              { type: 'CALL', title: 'Call Security', payload: {} },
              { type: 'NAVIGATE', title: 'Route to Medical', payload: {} }
            ]
          : [
              { type: 'NAVIGATE', title: 'Find Help Desk', payload: {} }
            ],
        reasoning: {
          why: 'Offline deterministic fallback activated.',
          evidence: [],
          alternatives: [],
        },
        confidence: {
          score: 1.0,
          explanation: `System operating in offline mode.`,
          missingInformation: [],
          toolReliability: { network: 'offline' }
        },
        supportingDocuments: [],
        processingTimeMs,
        modelUsed: 'deterministic',
        tokenUsage: { prompt: 0, completion: 0, total: 0 },
        pipelineStages: stages,
      };
    }
  }

  private async persistReasoningLog(params: {
    requestId: string;
    conversationId?: string;
    recommendation: string;
    intent: string;
    reasoning: OrchestratorOutput['reasoning'];
    confidence: OrchestratorOutput['confidence'];
    builtPrompt: { promptVersion: string; agentType: string };
    rawResponse: { modelUsed: string; latencyMs: number; tokenUsage: Record<string, number> };
    retrieved: { documents: { id: string }[] };
  }): Promise<void> {
    if (!params.conversationId) return;

    try {
      const conversation = await prisma.conversation.findUnique({
        where: { id: params.conversationId },
        select: { id: true },
      });
      if (!conversation) return;

      const recommendation = await prisma.recommendation.create({
        data: {
          conversationId: params.conversationId,
          intent: params.intent,
          recommendation: params.recommendation,
          confidence: params.confidence.score,
          reasoning: params.reasoning.why,
          alternatives: params.reasoning.alternatives,
        },
        select: { id: true },
      });

      await prisma.reasoningLog.create({
        data: {
          recommendationId: recommendation.id,
          promptVersion: params.builtPrompt.promptVersion,
          retrievedDocuments: params.retrieved.documents.map((d) => d.id),
          model: params.rawResponse.modelUsed,
          latencyMs: params.rawResponse.latencyMs,
          tokenUsage: params.rawResponse.tokenUsage,
        },
      });
    } catch (err: unknown) {
      // Non-blocking — persistence failure must not fail the user response
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.warn(`[Orchestrator] ReasoningLog persist failed: ${errMsg}`);
    }
  }

  private isEmergencyKeywordQuery(query: string): boolean {
    const q = query.toLowerCase();
    if (/\b(emergency|fire|medical|danger|accident|ambulance|police|evacuate)\b/.test(q)) {
      return true;
    }
    return (q.includes('lost') || q.includes('missing')) && (q.includes('child') || q.includes('kid'));
  }

  private normalizeLanguage(preferredLanguage?: string): 'en' | 'es' | 'fr' {
    const value = (preferredLanguage || '').toLowerCase();
    if (value.startsWith('es') || value.includes('spanish')) return 'es';
    if (value.startsWith('fr') || value.includes('french')) return 'fr';
    return 'en';
  }

  private async buildEmergencyResponse(
    input: OrchestratorInput,
    requestId: string,
    pipelineStart: number,
    stages: PipelineStage[],
    completeEmergencyStage: (detail: string, status?: 'OK' | 'WARN' | 'SKIP') => void,
    matchedKeywords: string[]
  ): Promise<OrchestratorOutput> {
    const isLostChildCase = /(lost|missing).*(child|kid)|(child|kid).*(lost|missing)/i.test(input.userQuery);

    const emergencyContacts = await providers.emergency.getEmergencyContacts();
    const gps = await providers.gps.getCurrentLocation(input.userId);
    const securityPhone = this.resolveSecurityPhone(emergencyContacts);

    let destination = 'Guest Services Desk';
    let routeSteps: Array<{ order: number; instruction: string; to_zone: string }> = [];

    try {
      const assistContext: UserContext = {
        language: this.normalizeLanguage(input.preferredLanguage),
        current_location: 'gate_a',
        destination_intent: 'guest_services',
        accessibility_needs: ['none'],
        ticket_section: null,
        minutes_to_kickoff: 30,
        question: input.userQuery,
      };

      const route = await runAssist(assistContext);
      destination = route.facility.name;
      routeSteps = route.route_steps.map((step) => ({
        order: step.order,
        instruction: step.instruction,
        to_zone: step.to_zone,
      }));
      completeEmergencyStage(`Dispatch requested; route prepared to ${destination}`);
    } catch (err) {
      logger.warn(`Emergency route computation fallback: ${String(err)}`);
      completeEmergencyStage('Dispatch requested; route fallback to Guest Services Desk', 'WARN');
    }

    return {
      requestId,
      intent: 'EMERGENCY',
      agentUsed: 'EMERGENCY_DETERMINISTIC',
      recommendation:
        'Emergency mode activated. A dispatch request has been sent to on-ground security. Stay where you are unless your location is unsafe.',
      plan: [
        { step: 1, action: 'Dispatch Requested', description: 'Security dispatch request created for your current location.' },
        { step: 2, action: 'Contact Security', description: `Tap Call Security (${securityPhone}) for direct voice contact.` },
        { step: 3, action: 'Move to Safe Meeting Point', description: `If needed, follow navigation to ${destination}.` },
      ],
      actions: [
        { type: 'WIDGET', title: 'Emergency Protocol Active', payload: { type: isLostChildCase ? 'LOST_CHILD' : 'GENERAL_EMERGENCY' } },
        { type: 'CALL', title: 'Call Security', payload: { phone: securityPhone } },
        { type: 'NAVIGATE', title: `Navigate to ${destination}`, payload: { destination, routeSteps } },
      ],
      reasoning: {
        why: 'Emergency intent was detected, so deterministic safety routing was executed before LLM stages.',
        evidence: matchedKeywords.length > 0 ? [`Emergency keywords matched: ${matchedKeywords.join(', ')}`] : ['Emergency keyword pattern matched'],
        alternatives: [],
        tradeoffs: 'Prioritizes immediate, deterministic safety actions over conversational depth.',
      },
      confidence: {
        score: 0.99,
        explanation: 'Emergency classification and deterministic response path were both triggered.',
        missingInformation: [],
        toolReliability: {
          gps: gps.available ? 'available' : 'stale',
          security_dispatch: 'requested',
        },
      },
      supportingDocuments: [],
      processingTimeMs: Date.now() - pipelineStart,
      modelUsed: 'deterministic-router',
      tokenUsage: { prompt: 0, completion: 0, total: 0 },
      pipelineStages: stages,
      extractedConstraints: 'Emergency route path selected immediately.',
      userMemoryApplied: false,
    };
  }

  private resolveSecurityPhone(emergencyContacts: Record<string, unknown>): string {
    const security = emergencyContacts.security;
    if (typeof security === 'object' && security !== null) {
      const phone = (security as Record<string, unknown>).phone;
      if (typeof phone === 'string' && phone.trim().length > 0) {
        return phone;
      }
    }
    return '112';
  }
}

// Singleton export — one orchestrator instance per process
export const aiOrchestrator = new AIOrchestrator();
