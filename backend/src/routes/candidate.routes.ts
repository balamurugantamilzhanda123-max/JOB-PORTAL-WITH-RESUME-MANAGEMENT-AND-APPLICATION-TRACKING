import { UserRole } from '@prisma/client';
import multer from 'multer';
import { Router } from 'express';
import {
  getMyApplicationDetailController,
  listMyApplicationsController,
  submitApplicationController,
} from '../controllers/application.controller';
import {
  addBookmarkController,
  listBookmarksController,
  removeBookmarkController,
} from '../controllers/bookmark.controller';
import { candidateDashboardController } from '../controllers/candidate.controller';
import {
  listCandidateInterviewsController,
  respondInterviewController,
} from '../controllers/interview.controller';
import {
  candidateJobStreamController,
  getCandidateJobDetailController,
  searchCandidateJobsController,
} from '../controllers/job.controller';
import {
  deleteResumeController,
  getResumeDetailController,
  listResumesController,
  reparseResumeController,
  resumeReadinessController,
  setDefaultResumeController,
  updateResumeController,
  uploadResumeController,
} from '../controllers/resume.controller';
import { authenticate, authorizeRoles, verifyCsrf } from '../middleware/auth.middleware';
import { searchRateLimiter } from '../middleware/rateLimit.middleware';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const router = Router();

router.use(authenticate, authorizeRoles(UserRole.CANDIDATE));

// Phase 1
router.get('/dashboard', candidateDashboardController);

// Phase 2: Jobs & Bookmarks
router.get('/jobs/stream', candidateJobStreamController);
router.get('/jobs', searchRateLimiter, searchCandidateJobsController);
router.get('/jobs/:jobId/resume-readiness', resumeReadinessController);
router.get('/jobs/:id', getCandidateJobDetailController);
router.get('/bookmarks', listBookmarksController);
router.post('/bookmarks/:jobId', verifyCsrf, addBookmarkController);
router.delete('/bookmarks/:jobId', verifyCsrf, removeBookmarkController);

// Phase 3: Resume Vault & Parsing Engine
router.post('/resumes/upload', verifyCsrf, upload.single('file'), uploadResumeController);
router.get('/resumes', listResumesController);
router.get('/resumes/:id', getResumeDetailController);
router.patch('/resumes/:id', verifyCsrf, updateResumeController);
router.post('/resumes/:id/set-default', verifyCsrf, setDefaultResumeController);
router.post('/resumes/:id/reparse', verifyCsrf, reparseResumeController);
router.delete('/resumes/:id', verifyCsrf, deleteResumeController);

// Phase 4: Application Flow & Live Tracker
router.post('/jobs/:jobId/applications', verifyCsrf, submitApplicationController);
router.get('/applications', listMyApplicationsController);
router.get('/applications/:id', getMyApplicationDetailController);

// Phase 5: Candidate Interviews
router.get('/interviews', listCandidateInterviewsController);
router.post('/interviews/:id/respond', verifyCsrf, respondInterviewController);

export default router;
