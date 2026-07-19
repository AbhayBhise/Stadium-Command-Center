// ─────────────────────────────────────────────────────────────────────────────
// Stage 4: Prompt Builder
// Assembles the final system + user prompt from context, knowledge, and intent.
// Deterministic construction — same inputs always produce the same prompt.
// Never exposes raw user query directly to Gemini without pre-processing.
// ─────────────────────────────────────────────────────────────────────────────

import {
  AgentType,
  BuiltPrompt,
  DetectedIntent,
  KnowledgeChunk,
  OrchestratorContext,
  OrchestratorInput,
} from './orchestrator.types';

const PROMPT_VERSION = '1.0.0';

const INTENT_TO_AGENT: Record<string, AgentType> = {
  NAVIGATION: 'NAVIGATION',
  ACCESSIBILITY: 'ACCESSIBILITY',
  CROWD_QUERY: 'CROWD',
  VOLUNTEER_HELP: 'VOLUNTEER',
  PLANNING: 'PLANNER',
  EMERGENCY: 'EMERGENCY',
  FACILITY_SEARCH: 'FACILITY',
  GENERAL: 'GENERAL',
};

const AGENT_SYSTEM_PROMPTS: Record<AgentType, string> = {
  NAVIGATION: `You are the Navigation Agent for Stadium Command Center. Your role is to guide users safely and efficiently through the stadium. Always evaluate multiple routes, comparing walk time vs queue time vs crowd density, and justify your choice.`,
  ACCESSIBILITY: `You are the Accessibility Agent for Stadium Command Center. You specialize in helping users with mobility, visual, or other accessibility needs navigate the stadium safely. Always prioritize wheelchair-accessible routes, elevators, and dedicated facilities. Use tools to verify elevator status.`,
  CROWD: `You are the Crowd Intelligence Agent for Stadium Command Center. You analyze crowd density and congestion to recommend the safest, least congested paths and facilities. Always use crowd and facility tools to reason about wait times.`,
  VOLUNTEER: `You are the Volunteer Operations Agent for Stadium Command Center. You assist stadium staff and volunteers with operational guidance, incident response, SOPs, and zone assignments. Always reference official procedures.`,
  PLANNER: `You are the Event Planner Agent for Stadium Command Center. You help users create a complete, personalized stadium visit plan including arrival time, parking, entry gate, food breaks, and exit strategy. You MUST generate a step-by-step 'plan' array.`,
  EMERGENCY: `You are the Emergency Response Agent for Stadium Command Center. In emergency situations, you MUST take immediate action. You MUST use your 'actions' array to output concrete executable actions (e.g., {"type": "CALL", "title": "Call Security", "payload": {}}, {"type": "NOTIFY", "title": "Alert Nearest Steward", "payload": {}}, {"type": "NAVIGATE", "title": "Navigate to Exit", "payload": {}}). Share GPS location implicitly, provide an ETA for help, and keep your text instructions extremely concise and calming. Never speculate.`,
  FACILITY: `You are the Facility Search Agent for Stadium Command Center. Help users locate washrooms, food courts, ATMs, medical stations, merchandise stores. You must use tools to find multiple options, compare them (e.g. distance vs queue), and explain your tradeoff reasoning.`,
  GENERAL: `You are the General Assistant for Stadium Command Center. You help spectators, volunteers, and organizers with any stadium-related question. Be concise, helpful, and accurate. Use tools dynamically to fetch data.`,
  EMERGENCY_DETERMINISTIC: `You are the Deterministic Emergency Router. You handle critical incidents safely by hard-routing users directly to help.`,
  DETERMINISTIC_FALLBACK: `You are the Deterministic Fallback Agent. You ensure users always get a safe, basic response even when online connectivity fails.`,
  CONTEXT_ENGINE_RULES: `You are the Context Engine Rules Agent. You handle deterministic, rule-based facility routing using the decision engine.`
};

export class PromptBuilderService {
  build(
    input: OrchestratorInput,
    intent: DetectedIntent,
    context: OrchestratorContext,
    knowledge: KnowledgeChunk[]
  ): BuiltPrompt {
    const agentType: AgentType = INTENT_TO_AGENT[intent.intent] ?? 'GENERAL';
    const systemPrompt = this.buildSystemPrompt(agentType);
    const userPrompt = this.buildUserPrompt(input, intent, context, knowledge);

    return {
      systemPrompt,
      userPrompt,
      agentType,
      promptVersion: PROMPT_VERSION,
      image: input.image,
    };
  }

  private buildSystemPrompt(agentType: AgentType): string {
    const sections: string[] = [];

    sections.push(`## Role\n${AGENT_SYSTEM_PROMPTS[agentType]}`);

    sections.push(`## Output Format
You MUST respond with a valid JSON object in this exact format. You are an autonomous agent capable of retrieving data via function calling. Use your tools to fetch needed information BEFORE deciding.
{
  "recommendation": "<explain the actions naturally to the user in 1-2 short sentences. E.g. 'Security has been notified. Stay where you are.'>",
  "plan": [
    {"step": 1, "action": "Navigate to Washroom C6", "description": "Quickest washroom (3 min wait)"},
    {"step": 2, "action": "Go to Section B2", "description": "Arrive 10 mins before kickoff"}
  ],
  "actions": [
    {"type": "NAVIGATE", "title": "Navigate to Gate", "payload": {"destination": "Gate 6"}}
  ],
  "reasoning": {
    "why": "<explanation of why this recommendation was made>",
    "evidence": ["<evidence point 1>", "<evidence point 2>"],
    "alternatives": ["<alternative option 1>", "<alternative option 2>"],
    "tradeoffs": "<explain multi-objective reasoning, e.g. 'Washroom C6 is 31m farther but saves 6 mins in queue compared to C4, reducing total time.'>"
  },
  "confidence": {
    "score": 0.85,
    "explanation": "<explain confidence based on tool freshness, missing data, and telemetry age>",
    "missingInformation": ["<what is missing>"],
    "toolReliability": {"gps": "fresh", "ticket": "offline"}
  }
}
Do not include any text outside the JSON object. Do not use markdown code fences.`);

    sections.push(`## Agentic Behavior Rules (CRITICAL)
1. ARCHITECTURE: You must operate sequentially through these 5 phases:
   - Goal Planner: Decompose the objective into subtasks.
   - Tool Selector: Decide which tools to call concurrently.
   - Constraint Resolver: Evaluate tool results against user constraints and memory. If a constraint fails, you MUST replan and call an alternative tool.
   - Action Planner: Generate the exact sequence of actions (your 'plan' array) that solves the user's objective.
   - Natural Language Generator: Formulate the 'recommendation' text to explain the plan naturally to the user.

2. AGENT VALIDATION & TOOL TRANSPARENCY:
   - Gemini must never hallucinate.
   - Every answer MUST clearly indicate which tools were used (e.g. "Based on Crowd telemetry and GPS...").
   - If tool data is unavailable or a tool fails, you MUST explicitly say "I couldn't verify [information]" instead of inventing it.

3. PREDICTIVE AI & MULTI-OBJECTIVE OPTIMIZATION:
   - Optimize simultaneously for walking distance, queue time, crowd density, accessibility, weather, and user deadlines.
   - You MUST explicitly state the measurable optimization in your 'recommendation' or 'plan' descriptions.

4. LIVE GROUNDING: Ground all responses using live telemetry, retrieved knowledge, and tool outputs. Never guess.

5. UNCERTAINTY MODELING: Offer fallbacks, explicitly state when data is stale, and compute the confidence score accordingly.
10. MULTIMODAL CAPABILITY: If an image is provided in the request (e.g. ticket, sign, QR code), use it as your primary visual ground truth. You MUST extract all relevant entities (e.g., section, row, seat, gate, parking lot, or issue details) directly from the image.
- Base all recommendations ONLY on the provided context and knowledge.
- For EMERGENCY intent, always direct to the nearest exit and emergency services.
- Always respect extracted constraints — they come directly from the user's request.
- You MUST generate your own UI action cards in the "actions" array based on your plan.`);

    return sections.join('\n\n');
  }

  private buildUserPrompt(
    input: OrchestratorInput,
    intent: DetectedIntent,
    context: OrchestratorContext,
    knowledge: KnowledgeChunk[]
  ): string {
    const sections: string[] = [];

    sections.push(
      `## USER REQUEST\nUser Query: ${input.userQuery}\nDetected Intent: ${intent.intent} (confidence: ${intent.confidence.toFixed(2)})\nUser Role: ${input.userRole}`
    );

    if (context.stadiumName) {
      sections.push(`## Stadium\n${context.stadiumName}`);
    }

    if (context.eventTitle) {
      sections.push(
        `## Current Event\nTitle: ${context.eventTitle}\nStatus: ${context.eventStatus ?? 'Unknown'}`
      );
    }

    if (context.zones && context.zones.length > 0) {
      sections.push(`## Stadium Zones\n${context.zones.join(', ')}`);
    }

    if (context.facilities && context.facilities.length > 0) {
      sections.push(`## Available Facilities\n${context.facilities.join('\n')}`);
    }

    if (context.userAccessibilityNeeds) {
      sections.push(`## User Accessibility Needs\n${context.userAccessibilityNeeds}`);
    }

    if (input.preferredLanguage && input.preferredLanguage !== 'en') {
      sections.push(`## Language\nRespond in: ${input.preferredLanguage}`);
    }

    if (knowledge.length > 0) {
      const knowledgeText = knowledge
        .map((k, i) => `[${String(i + 1)}] ${k.title} (${k.documentType}):\n${k.content}`)
        .join('\n\n');
      sections.push(`## Retrieved Knowledge\n${knowledgeText}`);
    } else {
      sections.push(
        `## Retrieved Knowledge\nNo specific documents retrieved. Use general stadium knowledge and reasoning.`
      );
    }

    if (context.recentConversation) {
      sections.push(`## Recent Conversation\n${context.recentConversation}`);
    }

    if (context.userMemory && context.userMemory !== 'No persistent preferences recorded yet.') {
      sections.push(
        `## User Memory (Persistent Preferences Learned Over Time)\n${context.userMemory}\n\nIMPORTANT: These are facts the user has told us previously. Always factor them into your recommendation without being asked again.`
      );
    }

    if (
      context.extractedConstraints &&
      context.extractedConstraints.summary !== 'No specific constraints detected'
    ) {
      sections.push(
        `## Extracted Constraints (From This Query)\n${context.extractedConstraints.summary}\n\nIMPORTANT: These constraints were parsed from the user's natural language query. Your recommendation MUST satisfy all listed constraints or explicitly explain why one cannot be met.`
      );
    }

    return sections.join('\n\n');
  }
}
