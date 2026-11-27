import { UserRole } from '@prisma/client';
import { Router } from 'express';
import {
  getRecruiterCompanyController,
  upsertRecruiterCompanyController,
} from '../controllers/analytics.controller';
import {
  getRecruiterApplicationDetailController,
  listJobApplicantsController,
  recruiterPipelineController,
  transitionApplicationStageController,
} from '../controllers/application.controller';
import {
  listEvaluationsController,
  listRecruiterInterviewsController,
  proposeInterviewController,
  submitEvaluationController,
  updateRecruiterInterviewStatusController,
} from '../controllers/interview.controller';
import {
  createRecruiterJobController,
  getRecruiterJobController,
  listRecruiterJobsController,
  recruiterJobStatsController,
  updateRecruiterJobController,
  updateRecruiterJobStatusController,
} from '../controllers/job.controller';
import { recruiterDashboardController } from '../controllers/recruiter.controller';
import { authenticate, authorizeRoles, verifyCsrf } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate, authorizeRoles(UserRole.RECRUITER));

// Phase 1
router.get('/dashboard', recruiterDashboardController);

// Phase 2: Job Management
router.get('/jobs/stats', recruiterJobStatsController);
router.get('/jobs', listRecruiterJobsController);
router.post('/jobs', verifyCsrf, createRecruiterJobController);
router.get('/jobs/:id', getRecruiterJobController);
router.put('/jobs/:id', verifyCsrf, updateRecruiterJobController);
router.patch('/jobs/:id/status', verifyCsrf, updateRecruiterJobStatusController);

// Phase 4: ATS Pipeline & Applicants
router.get('/jobs/:jobId/applicants', listJobApplicantsController);
router.get('/pipeline', recruiterPipelineController);
router.get('/applications/:id', getRecruiterApplicationDetailController);
router.patch('/applications/:id/stage', verifyCsrf, transitionApplicationStageController);

// Phase 5: Interviews & Scorecards
router.post('/applications/:id/interviews', verifyCsrf, proposeInterviewController);
router.get('/interviews', listRecruiterInterviewsController);
router.patch('/interviews/:id', verifyCsrf, updateRecruiterInterviewStatusController);
router.post('/applications/:id/evaluations', verifyCsrf, submitEvaluationController);
router.get('/applications/:id/evaluations', listEvaluationsController);

// Phase 6: Company Profile
router.get('/company', getRecruiterCompanyController);
router.put('/company', verifyCsrf, upsertRecruiterCompanyController);

export default router;
