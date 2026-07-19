// ─────────────────────────────────────────────────────────────────────────────
// Stage 6: Response Validator
// Validates Gemini's raw text output before it is exposed to the user.
// Ensures: JSON parsability, required fields, confidence range, safety.
// Invalid responses are rejected — the orchestrator handles fallback.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import { RawAIResponse, ValidatedResponse } from './orchestrator.types';
import { logger } from '../config/logger';

const AIResponseSchema = z.object({
  recommendation: z.string().min(1),
  plan: z
    .array(
      z.object({
        step: z.number(),
        action: z.string(),
        description: z.string(),
      })
    )
    .optional(),
  actions: z
    .array(
      z.object({
        type: z.string(),
        title: z.string(),
        payload: z.record(z.unknown()).optional(),
      })
    )
    .optional(),
  reasoning: z.object({
    why: z.string().min(1),
    evidence: z.array(z.string()),
    alternatives: z.array(z.string()),
    tradeoffs: z.string().optional(),
  }),
  confidence: z
    .object({
      score: z.number().min(0).max(1),
      explanation: z.string(),
      missingInformation: z.array(z.string()).optional(),
      toolReliability: z.record(z.string()).optional(),
    })
    .optional(),
});

const SAFETY_BLOCKLIST = [
  'i cannot help',
  "i'm unable to assist",
  'i do not have access',
  'as an ai',
  'i am an ai',
];

export class ResponseValidatorService {
  validate(raw: RawAIResponse, requestId: string): ValidatedResponse {
    const notes: string[] = [];
    let isValid = true;

    // 1. Extract JSON from the raw text (strip markdown fences if present)
    const jsonText = this.extractJson(raw.text);

    if (!jsonText) {
      logger.warn(`[ResponseValidator] requestId=${requestId} — no JSON found in response`);
      return {
        recommendation: '',
        isValid: false,
        validationNotes: ['No JSON found in response'],
      };
    }

    // 2. Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText) as unknown;
    } catch {
      logger.warn(`[ResponseValidator] requestId=${requestId} — JSON parse failed`);
      return {
        recommendation: '',
        isValid: false,
        validationNotes: ['JSON parse failed'],
      };
    }

    // 3. Schema validation
    const result = AIResponseSchema.safeParse(parsed);
    if (!result.success) {
      logger.error(
        `[ResponseValidator] requestId=${requestId} — schema invalid: ${result.error.message}\nRAW TEXT:\n${raw.text}`
      );
      return {
        recommendation: '',
        isValid: false,
        validationNotes: [`Schema invalid: ${result.error.message}`],
      };
    }

    const data = result.data;

    // 4. Safety check
    const lowerRec = data.recommendation.toLowerCase();
    for (const phrase of SAFETY_BLOCKLIST) {
      if (lowerRec.includes(phrase)) {
        notes.push(`Safety flag: response contains "${phrase}"`);
      }
    }

    // 5. Confidence range validation
    if (data.confidence && data.confidence.score < 0.2) {
      notes.push(
        `Confidence is extremely low (${String(data.confidence.score)}). Consider fallback.`
      );
      isValid = false;
    }

    logger.debug(
      `[ResponseValidator] requestId=${requestId} — valid=${String(notes.length === 0 && isValid)}`
    );

    return {
      recommendation: result.data.recommendation,
      isValid: notes.length === 0 && isValid,
      validationNotes: notes,
      reasoning: result.data.reasoning,
      confidence: data.confidence
        ? {
            score: data.confidence.score,
            explanation: data.confidence.explanation,
            missingInformation: data.confidence.missingInformation || [],
            toolReliability: data.confidence.toolReliability || {},
          }
        : undefined,
      plan: result.data.plan,
      actions: result.data.actions,
    };
  }

  // Parse the validated structured data fully (used by orchestrator for reasoning/confidence)
  parseStructured(raw: RawAIResponse): ReturnType<typeof AIResponseSchema.parse> | null {
    const jsonText = this.extractJson(raw.text);
    if (!jsonText) return null;
    try {
      const parsed = JSON.parse(jsonText) as unknown;
      return AIResponseSchema.parse(parsed);
    } catch {
      return null;
    }
  }

  private extractJson(text: string): string | null {
    // Strip markdown code fences
    const fenceMatch = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
    if (fenceMatch?.[1]) return fenceMatch[1].trim();

    // Try to find raw JSON object
    const objectMatch = /\{[\s\S]*\}/.exec(text);
    return objectMatch ? objectMatch[0] : null;
  }
}
