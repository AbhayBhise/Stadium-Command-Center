// ─────────────────────────────────────────────────────────────────────────────
// Stage 5: Agentic Gemini Adapter
// Uses Google Generative AI's native Function Calling (Tools) to execute a ReAct
// loop. Gemini can call multiple providers before finalizing its response.
// ─────────────────────────────────────────────────────────────────────────────

import {
  GoogleGenerativeAI,
  GenerativeModel,
  FunctionCall,
  DynamicRetrievalMode,
  Part,
} from '@google/generative-ai';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { BuiltPrompt, RawAIResponse, PipelineStage } from './orchestrator.types';
import { AppError } from '../lib/AppError';
import { agentTools } from './agent-tools';
import { providers } from '../providers/context.providers';

const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1_000;

export class GeminiAdapter {
  private readonly model: GenerativeModel;

  constructor() {
    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    this.model = genAI.getGenerativeModel({
      model: env.GEMINI_MODEL,
      tools: [
        { functionDeclarations: agentTools },
        {
          googleSearchRetrieval: {
            dynamicRetrievalConfig: {
              mode: DynamicRetrievalMode.MODE_DYNAMIC,
              dynamicThreshold: 0.3,
            },
          },
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });
  }

  async generate(
    prompt: BuiltPrompt,
    requestId: string,
    onProgress?: (stage: PipelineStage) => void
  ): Promise<RawAIResponse> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
      try {
        const start = Date.now();
        let totalPromptTokens = 0;
        let totalCompletionTokens = 0;

        // Initialize chat session to maintain state for function calling
        const chat = this.model.startChat({
          systemInstruction: {
            role: 'system',
            parts: [{ text: prompt.systemPrompt }],
          },
          generationConfig: {
            temperature: 0.3,
            topP: 0.8,
            maxOutputTokens: 2048,
          },
        });

        // 1. Send initial user prompt (multimodal support)
        logger.debug(`[GeminiAdapter] requestId=${requestId} sending initial prompt...`);
        const messageParts: Part[] = [{ text: prompt.userPrompt }];
        if (prompt.image) {
          messageParts.push({
            inlineData: {
              data: prompt.image.data,
              mimeType: prompt.image.mimeType,
            },
          });
          onProgress?.({
            stage: 'Multimodal Processor',
            status: 'OK',
            durationMs: 50,
            detail: `Parsed image input (${prompt.image.mimeType}) for reasoning.`,
          });
        }

        const initialSendStart = Date.now();
        let result = await this.withTimeout(chat.sendMessage(messageParts), TIMEOUT_MS);

        onProgress?.({
          stage: 'Gemini Planner',
          status: 'OK',
          durationMs: Date.now() - initialSendStart,
          detail: 'Initial objective breakdown and tool selection complete.',
        });

        let response = result.response;
        totalPromptTokens += response.usageMetadata?.promptTokenCount ?? 0;
        totalCompletionTokens += response.usageMetadata?.candidatesTokenCount ?? 0;

        // 2. The ReAct Loop (Function Calling)
        let toolCalls = response.functionCalls();
        let loopCount = 0;
        const MAX_REACT_LOOPS = 10;

        while (toolCalls && toolCalls.length > 0 && loopCount < MAX_REACT_LOOPS) {
          loopCount++;
          const callNames = toolCalls.map((c) => c.name).join(', ');
          logger.info(
            `[GeminiAdapter] requestId=${requestId} loop=${String(loopCount)} functionCalls=${String(toolCalls.length)}`
          );

          onProgress?.({
            stage: `Parallel Executor (Loop ${String(loopCount)})`,
            status: 'OK',
            durationMs: 15,
            detail: `Calling independent tools concurrently: ${callNames}`,
          });

          const toolStart = Date.now();

          const functionResponses = await Promise.all(
            toolCalls.map(async (call: FunctionCall) => {
              const res = await this.executeTool(call, requestId);
              return {
                functionResponse: {
                  name: call.name,
                  response: res,
                },
              };
            })
          );

          const toolLatency = Date.now() - toolStart;
          onProgress?.({
            stage: `Tool Evaluator (Loop ${String(loopCount)})`,
            status: 'OK',
            durationMs: toolLatency,
            detail: `Executed ${String(toolCalls.length)} tools. Evaluating results.`,
          });

          // 3. Send tool results back to Gemini
          logger.debug(
            `[GeminiAdapter] requestId=${requestId} returning ${String(functionResponses.length)} tool responses to model`
          );
          result = await this.withTimeout(chat.sendMessage(functionResponses), TIMEOUT_MS);
          response = result.response;

          totalPromptTokens += response.usageMetadata?.promptTokenCount ?? 0;
          totalCompletionTokens += response.usageMetadata?.candidatesTokenCount ?? 0;

          toolCalls = response.functionCalls();
        }

        const latencyMs = Date.now() - start;
        const text = response.text();
        const totalTokens = totalPromptTokens + totalCompletionTokens;

        onProgress?.({
          stage: 'Final Reasoning',
          status: 'OK',
          durationMs: latencyMs,
          detail: `Generated multi-objective optimized response in ${String(latencyMs)}ms (${String(loopCount)} loops).`,
        });

        logger.info(
          `[GeminiAdapter] requestId=${requestId} attempt=${String(attempt)} loops=${String(loopCount)} latency=${String(latencyMs)}ms tokens=${String(totalTokens)}`
        );

        return {
          text,
          modelUsed: env.GEMINI_MODEL,
          latencyMs,
          tokenUsage: {
            prompt: totalPromptTokens,
            completion: totalCompletionTokens,
            total: totalTokens,
          },
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        logger.warn(
          `[GeminiAdapter] requestId=${requestId} attempt=${String(attempt)} failed: ${lastError.message}`
        );

        if (attempt <= MAX_RETRIES) {
          await this.delay(RETRY_DELAY_MS * attempt);
        }
      }
    }

    throw new AppError(
      `Gemini unavailable after ${String(MAX_RETRIES + 1)} attempts: ${lastError?.message ?? 'unknown'}`,
      503,
      true
    );
  }

  // Orchestrates the actual backend service calls based on Gemini's function call
  private async executeTool(
    call: FunctionCall,
    requestId: string
  ): Promise<Record<string, unknown>> {
    logger.debug(`[GeminiAdapter] requestId=${requestId} Executing Tool: ${call.name}`);
    try {
      switch (call.name) {
        case 'getGPSData':
          return await providers.gps.getCurrentLocation('user-1');
        case 'getParkingData':
          return await providers.parking.getParkingStatus();
        case 'getCrowdData': {
          const loc = (call.args as { location?: string }).location || 'Unknown';
          return await providers.crowd.getCrowdDensity(loc);
        }
        case 'getFacilityData': {
          const type = (call.args as { type?: string }).type || 'FOOD';
          return { facilities: await providers.facility.getNearestFacility(type, {}) };
        }
        case 'getMedicalData':
          return await providers.emergency.getEmergencyContacts();
        case 'getStaffData':
          return await providers.staff.getStaffDirectory();
        case 'getTicketData':
          return await providers.ticket.getTicket('user-1');
        case 'getWeatherData':
          return await providers.weather.getWeather();
        default:
          return { error: `Unknown tool: ${call.name}` };
      }
    } catch (e) {
      return { error: `Tool execution failed: ${e instanceof Error ? e.message : String(e)}` };
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => {
        reject(new Error(`Gemini request timed out after ${String(ms)}ms`));
      }, ms)
    );
    return Promise.race([promise, timeout]);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
