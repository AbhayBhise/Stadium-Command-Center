import { z } from 'zod';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';

const envFile = dotenv.config();
dotenvExpand.expand(envFile);

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z
    .string()
    .default('4000')
    .transform((val) => parseInt(val, 10)),

  // Database (optional in development — Prisma features gracefully degrade)
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL').optional(),

  // Redis (optional — caching gracefully degrades)
  REDIS_URL: z.string().url('REDIS_URL must be a valid URL').default('redis://localhost:6379'),

  // JWT (optional in development — auth middleware skipped)
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters').optional().default('dev-jwt-secret-must-be-at-least-32-chars-long!!'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters').optional().default('dev-jwt-refresh-secret-must-be-at-least-32-chars!!!'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  // Google Gemini (optional — falls back to deterministic mode when absent)
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z
    .string()
    .regex(/^[a-zA-Z0-9.-]+$/, 'GEMINI_MODEL must not contain spaces or special characters')
    .default('gemini-2.5-flash'),

  // File Upload
  UPLOAD_DIR: z.string().default('uploads'),
  MAX_FILE_SIZE_MB: z
    .string()
    .default('50')
    .transform((val) => parseInt(val, 10)),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z
    .string()
    .default('900000')
    .transform((val) => parseInt(val, 10)),
  RATE_LIMIT_MAX_REQUESTS: z
    .string()
    .default('100')
    .transform((val) => parseInt(val, 10)),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:');
  console.error(JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

export const env = parsedEnv.data;
export type Env = typeof env;
