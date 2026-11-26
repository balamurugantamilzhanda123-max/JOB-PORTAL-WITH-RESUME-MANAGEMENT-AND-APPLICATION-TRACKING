import { UserRole } from '@prisma/client';
import { Router } from 'express';
import {
  listEvaluationsController,
  submitEvaluationController,
} from '../controllers/interview.controller';
import { authenticate, authorizeRoles, verifyCsrf } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.post(
  '/application/:id',
  authorizeRoles(UserRole.RECRUITER),
  verifyCsrf,
  submitEvaluationController,
);
router.get('/application/:id', listEvaluationsController);

export default router;

