import { randomUUID } from 'crypto';
import { aiOrchestrator } from '../../orchestrator';
import {
  OrchestratorInput,
  OrchestratorOutput,
  PipelineStage,
} from '../../orchestrator/orchestrator.types';
import { ChatRequest } from './chat.schema';

// Service layer — coordinates the orchestrator call.
// Business logic lives here, not in the controller.
export class ChatService {
  async processMessage(
    body: ChatRequest,
    userId: string,
    userRole: string,
    language: string,
    accessibilityNeeds: string,
    onProgress?: (stage: PipelineStage) => void
  ): Promise<OrchestratorOutput> {
    const input: OrchestratorInput = {
      requestId: randomUUID(),
      userQuery: body.message,
      userId,
      userRole,
      stadiumId: body.stadiumId,
      eventId: body.eventId,
      conversationId: body.conversationId,
      preferredLanguage: language || body.preferredLanguage,
      accessibilityNeeds: accessibilityNeeds,
      image: body.image || undefined,
    };

    return aiOrchestrator.processUserRequest(input, onProgress);
  }
}

export const chatService = new ChatService();
