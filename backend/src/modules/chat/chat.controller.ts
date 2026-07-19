import { Request, Response, NextFunction } from 'express';
import { ChatRequestSchema } from './chat.schema';
import { chatService } from './chat.service';
import { mapOrchestratorToResponse } from './chat.types';
import { PipelineStage } from '../../orchestrator/orchestrator.types';
import { AppError } from '../../lib/AppError';
import { providers } from '../../providers/context.providers';

import { logger } from '../../config/logger';

// Thin controller — validates input, delegates to service, formats response.
// Zero business logic lives here.
export class ChatController {
  async getGreeting(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const eventContext = await providers.event.getEventContext();
      const language = req.headers['x-user-language'] as string || 'English';
      
      let greeting = `Welcome, Abhay.\n\n${eventContext.event}\n\n${eventContext.match} begins in ${eventContext.currentMinute.replace('T-', '')} minutes.\n\nGate 6 currently has the shortest queue.`;
      
      if (language !== 'English') {
        greeting = `Welcome to Stadium Command Center. I see your language is ${language}. How can I assist you today?`;
        // We will make this more robust in the backend via gemini, but for now we fallback to standard localized strings.
      }
      res.json({ greeting });
    } catch (err) {
      next(err);
    }
  }

  async chat(req: Request, res: Response, next: NextFunction): Promise<void> {
    const stage1Start = Date.now();
    logger.info(`[ChatPipeline] 1. Entered chat.controller.ts with body: ${JSON.stringify(req.body)}`);
    
    try {
      // 1. Zod validation
      const parsed = ChatRequestSchema.safeParse(req.body);
      
      logger.info(`[ChatPipeline] 1. Zod Validation. Elapsed: ${Date.now() - stage1Start}ms. Success: ${parsed.success}`);

      if (!parsed.success) {
        const message = parsed.error.errors.map((e) => e.message).join('; ');
        logger.error(`[ChatPipeline] Zod Validation Failed: ${message}`);
        throw new AppError(message, 400);
      }
      
      logger.info(`[ChatPipeline] 1. Parsed Input Shape: ${Object.keys(parsed.data).join(', ')}`);

      // Until auth is implemented, accept user identity from request headers.
      // Auth middleware will replace these with verified JWT claims.
      const rawUserId = req.headers['x-user-id'];
      const rawUserRole = req.headers['x-user-role'];
      const rawLanguage = req.headers['x-user-language'];
      const rawAccessibility = req.headers['x-accessibility-needs'];
      const userId = Array.isArray(rawUserId) ? rawUserId[0] : (rawUserId ?? 'anonymous');
      const userRole = Array.isArray(rawUserRole) ? rawUserRole[0] : (rawUserRole ?? 'SPECTATOR');
      const language = Array.isArray(rawLanguage) ? rawLanguage[0] : (rawLanguage ?? 'English');
      const accessibilityNeeds = Array.isArray(rawAccessibility) ? rawAccessibility[0] : (rawAccessibility ?? 'none');

      // 2. Setup SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });

      // 3. Delegate to service → orchestrator with onProgress callback
      const stage3Start = Date.now();
      logger.info(`[ChatPipeline] 3. Calling chatService.processMessage`);
      
      const output = await chatService.processMessage(
        parsed.data,
        userId,
        userRole,
        language,
        accessibilityNeeds,
        (stage: PipelineStage) => {
          // Stream intermediate pipeline stages
          res.write(`data: ${JSON.stringify({ type: 'stage', data: stage })}\n\n`);
        }
      );
      
      logger.info(`[ChatPipeline] 3. chatService.processMessage complete. Elapsed: ${Date.now() - stage3Start}ms. Output Shape: ${Object.keys(output).join(', ')}`);

      // 4. Send final response
      res.write(
        `data: ${JSON.stringify({ type: 'complete', data: mapOrchestratorToResponse(output) })}\n\n`
      );
      res.end();
    } catch (err: unknown) {
      logger.error(`[ChatPipeline] Error caught in controller: ${err instanceof Error ? err.stack : String(err)}`);
      if (res.headersSent) {
        // SSE is already active, we must stream the error
        const message = err instanceof Error ? err.message : String(err);
        res.write(`data: ${JSON.stringify({ type: 'error', data: { message, stage: 'Backend Orchestrator', stack: err instanceof Error ? err.stack : undefined } })}\n\n`);
        res.end();
      } else {
        next(err);
      }
    }
  }
}

export const chatController = new ChatController();
