import { z } from 'zod';

export const ChatRequestSchema = z.object({
  message: z
    .string({ required_error: 'message is required' })
    .min(1, 'message cannot be empty')
    .max(2000, 'message cannot exceed 2000 characters')
    .trim(),
  stadiumId: z.string().uuid('stadiumId must be a valid UUID').optional(),
  eventId: z.string().uuid('eventId must be a valid UUID').optional(),
  conversationId: z.string().uuid('conversationId must be a valid UUID').optional(),
  preferredLanguage: z.string().max(10).default('en'),
  image: z
    .object({
      data: z.string(),
      mimeType: z.string(),
    })
    .nullish(),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;
