import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { logger } from './config/logger';
import { env } from './config/env';
import { errorMiddleware } from './middleware/error.middleware';
import { notFoundMiddleware } from './middleware/notFound.middleware';
import { sanitizeMiddleware } from './middleware/sanitize.middleware';
import healthRoutes from './routes/health.routes';
import { chatRoutes } from './modules/chat';
import { assistRoutes } from './modules/assist';

const app: Application = express();

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (env.NODE_ENV === 'development') {
        callback(null, true);
        return;
      }

      const allowedOrigins = env.CORS_ORIGIN.split(',').map((item) => item.trim());
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-user-role', 'x-user-language', 'x-accessibility-needs'],
  })
);

// ── Rate Limiting ─────────────────────────────────────────────────────────────
app.use(
  rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { message: 'Too many requests. Please try again later.' } },
  })
);

// ── Performance ───────────────────────────────────────────────────────────────
app.use(compression());

// ── Parsing ───────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeMiddleware);

// ── HTTP Logging ──────────────────────────────────────────────────────────────
app.use(
  morgan('combined', {
    stream: { write: (message: string) => logger.info(message.trim()) },
    skip: () => env.NODE_ENV === 'test',
  })
);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/health', healthRoutes);
app.use('/api', healthRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/assist', assistRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use(notFoundMiddleware);

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use(errorMiddleware);

export default app;
