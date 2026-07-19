import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { env } from '../config/env';
import { AppError } from '../lib/AppError';

export const errorMiddleware = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const isOperational = isAppError ? err.isOperational : false;
  const message = err.message || 'Internal Server Error';

  const logMessage = `[${String(statusCode)}] ${req.method} ${req.originalUrl} — ${message} — IP: ${String(req.ip)}`;

  // Operational errors (4xx, known 5xx) → warn; programming errors → error
  if (isOperational && statusCode < 500) {
    logger.warn(logMessage);
  } else {
    logger.error(logMessage);
    if (!isOperational) {
      logger.error(err.stack ?? 'No stack trace');
    }
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};
