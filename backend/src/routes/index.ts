import { Router } from 'express';
import adminRoutes from './admin.routes';
import analyticsRoutes from './analytics.routes';
import applicationRoutes from './application.routes';
import authRoutes from './auth.routes';
import candidateRoutes from './candidate.routes';
import evaluationRoutes from './evaluation.routes';
import healthRoutes from './health.routes';
import notificationRoutes from './notification.routes';
import publicRoutes from './public.routes';
import recruiterRoutes from './recruiter.routes';
import resumeRoutes from './resume.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/public', publicRoutes);
router.use('/auth', authRoutes);
router.use('/candidate', candidateRoutes);
router.use('/recruiter', recruiterRoutes);
router.use('/admin', adminRoutes);
router.use('/resumes', resumeRoutes);
router.use('/applications', applicationRoutes);
router.use('/evaluations', evaluationRoutes);
router.use('/notifications', notificationRoutes);
router.use('/analytics', analyticsRoutes);

export default router;
