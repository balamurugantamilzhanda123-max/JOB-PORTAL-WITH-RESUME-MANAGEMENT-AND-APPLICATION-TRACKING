import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { funnelAnalyticsController } from '../controllers/analytics.controller';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';

const router = Router();

router.get(
  '/funnel',
  authenticate,
  authorizeRoles(UserRole.RECRUITER, UserRole.ADMIN),
  funnelAnalyticsController,
);

export default router;

