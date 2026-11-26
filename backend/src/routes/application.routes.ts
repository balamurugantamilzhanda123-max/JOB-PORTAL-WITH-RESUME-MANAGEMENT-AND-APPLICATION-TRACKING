import { UserRole } from '@prisma/client';
import { Router } from 'express';
import {
  getMyApplicationDetailController,
  listJobApplicantsController,
  listMyApplicationsController,
  recruiterPipelineController,
  submitApplicationController,
  transitionApplicationStageController,
} from '../controllers/application.controller';
import { authenticate, authorizeRoles, verifyCsrf } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Candidate endpoints
router.post(
  '/jobs/:jobId',
  authorizeRoles(UserRole.CANDIDATE),
  verifyCsrf,
  submitApplicationController,
);
router.get('/me', authorizeRoles(UserRole.CANDIDATE), listMyApplicationsController);
router.get('/me/:id', authorizeRoles(UserRole.CANDIDATE), getMyApplicationDetailController);

// Recruiter endpoints
router.get('/pipeline', authorizeRoles(UserRole.RECRUITER), recruiterPipelineController);
router.get('/job/:jobId', authorizeRoles(UserRole.RECRUITER), listJobApplicantsController);
router.patch(
  '/:id/stage',
  authorizeRoles(UserRole.RECRUITER),
  verifyCsrf,
  transitionApplicationStageController,
);

export default router;

