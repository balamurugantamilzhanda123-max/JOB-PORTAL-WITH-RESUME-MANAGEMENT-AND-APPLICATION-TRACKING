import { Router } from 'express';
import {
  publicJobDetailController,
  publicJobsSearchController,
} from '../controllers/analytics.controller';
import { searchRateLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

router.get('/jobs', searchRateLimiter, publicJobsSearchController);
router.get('/jobs/:id', publicJobDetailController);

export default router;

