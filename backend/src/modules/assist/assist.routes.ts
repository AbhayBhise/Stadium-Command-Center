import { Router } from 'express';
import { assistController } from './assist.controller';

const router = Router();

router.post('/', assistController.assist.bind(assistController));

export { router as assistRoutes };
