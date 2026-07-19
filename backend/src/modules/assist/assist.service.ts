import { UserContext, AssistResponse } from '../../models/schemas';
import { getStadium } from '../../providers/stadium-data.provider';
import { buildDecision } from '../../services/context-engine.service';
import { renderAnswer, PhrasingContext } from '../../services/phrasing.service';
import { GeminiAdapter } from '../../orchestrator/gemini.adapter';
import { logger } from '../../config/logger';

let geminiAdapter: GeminiAdapter | null = null;

function getGeminiAdapter(): GeminiAdapter | null {
  if (geminiAdapter) return geminiAdapter;
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim().length === 0) {
      logger.info('[AssistService] No GEMINI_API_KEY — using deterministic phrasing only');
      return null;
    }
    geminiAdapter = new GeminiAdapter();
    return geminiAdapter;
  } catch (err) {
    logger.warn(`[AssistService] Failed to initialize Gemini: ${String(err)}`);
    return null;
  }
}

export async function runAssist(ctx: UserContext): Promise<AssistResponse> {
  const stadium = getStadium();
  const decision = buildDecision(ctx, stadium);

  const totalDistance = decision.route_steps.reduce((acc, step) => acc + step.distance, 0);

  const phrasingCtx: PhrasingContext = {
    language: decision.language,
    facilityName: decision.facility.name,
    facilityType: decision.facility.type,
    facilityLandmark: decision.facility.landmark,
    crowdLevel: decision.crowd_level,
    accessibilityMode: decision.accessibility_mode,
    landmarkBased: decision.landmark_based,
    hurry: decision.hurry,
    alternativeType: decision.alternatives_note ? decision.facility.type : null,
    totalDistance,
    stepCount: decision.route_steps.length,
  };

  let answer: string;
  let usedLlm = false;

  const hasQuestion = ctx.question && ctx.question.trim().length > 0;
  const adapter = getGeminiAdapter();

  if (hasQuestion && adapter) {
    try {
      const systemPrompt = buildAssistSystemPrompt();
      const userPrompt = buildAssistUserPrompt(ctx, decision, phrasingCtx);

      const result = await adapter.generate(
        { systemPrompt, userPrompt, agentType: 'FACILITY', promptVersion: 'assist-v1' },
        `assist-${Date.now()}`
      );

      const parsed = extractAnswerFromAI(result.text);
      if (parsed && parsed.trim().length > 10) {
        answer = parsed;
        usedLlm = true;
        logger.info('[AssistService] LLM phrasing succeeded');
      } else {
        answer = renderAnswer(phrasingCtx);
        usedLlm = false;
      }
    } catch (err) {
      logger.warn(`[AssistService] LLM phrasing failed, falling back: ${String(err)}`);
      answer = renderAnswer(phrasingCtx);
      usedLlm = false;
    }
  } else {
    answer = renderAnswer(phrasingCtx);
    usedLlm = false;
  }

  logger.info(
    `assist location=${ctx.current_location} intent=${ctx.destination_intent} needs=${ctx.accessibility_needs.join('+')} crowd=${decision.crowd_level} used_llm=${usedLlm}`
  );

  return {
    answer,
    route_steps: decision.route_steps,
    facility: decision.facility,
    crowd_level: decision.crowd_level,
    language: decision.language,
    accessibility_mode: decision.accessibility_mode,
    alternatives_note: decision.alternatives_note,
    urgency: decision.urgency,
    used_llm: usedLlm,
  };
}

function buildAssistSystemPrompt(): string {
  return `You are a stadium navigation assistant. Given verified facts about a facility and route, rephrase the answer naturally for the user.
Use ONLY the provided VERIFIED_FACTS. Do not invent any information.
Keep your response concise (1-3 sentences). Include the route steps summary.
If the user asked a question, answer it directly using the verified facts.`;
}

function buildAssistUserPrompt(
  ctx: UserContext,
  decision: { facility: { name: string; type: string; zone: string }; crowd_level: string; route_steps: { instruction: string }[] },
  phrasingCtx: PhrasingContext
): string {
  const routeSummary = decision.route_steps.map((s, i) => `${i + 1}. ${s.instruction}`).join('\n');

  return `VERIFIED_FACTS:
- Destination: ${decision.facility.name} (${decision.facility.type})
- Zone: ${decision.facility.zone}
- Crowd Level: ${decision.crowd_level}
- Route Steps: ${decision.route_steps.length}
- Step-free Required: ${ctx.accessibility_needs.includes('wheelchair') || ctx.accessibility_needs.includes('visual')}

ROUTE:
${routeSummary}

${phrasingCtx.alternativeType ? 'NOTE: A quieter alternative was suggested due to high crowd at the nearest facility.' : ''}
${phrasingCtx.hurry ? 'NOTE: Kickoff is imminent — emphasize urgency.' : ''}

USER QUESTION: ${ctx.question || 'Provide navigation guidance'}

Language: ${ctx.language}`;
}

function extractAnswerFromAI(rawText: string): string | null {
  try {
    const fenceMatch = /```(?:json)?\s*([\s\S]*?)```/.exec(rawText);
    const jsonText = fenceMatch?.[1] || rawText;
    const objectMatch = /\{[\s\S]*\}/.exec(jsonText);
    if (objectMatch) {
      const parsed = JSON.parse(objectMatch[0]) as { recommendation?: string; answer?: string; text?: string };
      return parsed.recommendation || parsed.answer || parsed.text || null;
    }
  } catch {
    // If not JSON, use raw text
  }
  return rawText;
}
