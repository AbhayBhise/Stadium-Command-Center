import { Request, Response, NextFunction } from 'express';

export function sanitizeMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string') {
        // Strip out dangerous characters
        let sanitized = req.body[key].replace(/[<>{}[\]\\]/g, '');
        // Truncate length
        if (sanitized.length > 500) {
          sanitized = sanitized.substring(0, 500);
        }
        req.body[key] = sanitized;
      }
    }
  }
  next();
}
