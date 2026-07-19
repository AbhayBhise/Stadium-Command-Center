import { Request, Response, NextFunction } from 'express';
import { UserContextSchema } from '../../models/schemas';
import { runAssist } from './assist.service';
import { AppError } from '../../lib/AppError';

export class AssistController {
  async assist(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = UserContextSchema.safeParse(req.body);
      if (!parsed.success) {
        const message = parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
        throw new AppError(`Validation error: ${message}`, 400);
      }

      const response = await runAssist(parsed.data);
      res.json(response);
    } catch (err) {
      if (err instanceof Error && err.name === 'RouteNotFoundError') {
        next(new AppError(err.message, 404));
        return;
      }
      next(err);
    }
  }
}

export const assistController = new AssistController();
