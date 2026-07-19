import { Router } from 'express';
import { chatController } from './chat.controller';

const router = Router();

/**
 * GET /api/chat/greeting
 * Returns a proactive, context-aware greeting.
 */
router.get('/greeting', (req, res, next) => {
  void chatController.getGreeting(req, res, next);
});

/**
 * POST /api/chat
 * Processes a user message through the full AI Orchestrator pipeline.
 */
router.post('/', (req, res, next) => {
  void chatController.chat(req, res, next);
});

export default router;
