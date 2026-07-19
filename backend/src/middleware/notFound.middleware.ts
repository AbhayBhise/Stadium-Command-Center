import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/AppError';

export const notFoundMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(`Route not found - ${req.originalUrl}`, 404));
};
