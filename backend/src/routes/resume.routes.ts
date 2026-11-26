import { Router } from 'express';
import { downloadResumeController } from '../controllers/resume.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Protected resume file download (Candidate owner, Recruiter owning applied job, or Admin)
router.get('/:id/download', authenticate, downloadResumeController);

export default router;

