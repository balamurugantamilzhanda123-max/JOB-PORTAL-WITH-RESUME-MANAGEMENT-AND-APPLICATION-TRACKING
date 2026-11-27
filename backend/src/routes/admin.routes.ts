import { UserRole } from '@prisma/client';
import { Router } from 'express';
import {
  adminCreateRetentionController,
  adminDashboardController,
  adminExecuteRetentionController,
  adminListRetentionController,
  adminListUsersController,
  adminRevokeUserSessionsController,
  adminSystemHealthController,
  adminToggleRetentionHoldController,
  adminUpdateUserRoleController,
  adminUpdateUserStatusController,
  adminUserStatsController,
} from '../controllers/admin.controller';
import {
  adminAuditLogsController,
  adminListCompaniesController,
  adminVerifyCompanyController,
  funnelAnalyticsController,
} from '../controllers/analytics.controller';
import { authenticate, authorizeRoles, verifyCsrf } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate, authorizeRoles(UserRole.ADMIN));

// Phase 1
router.get('/dashboard', adminDashboardController);
router.get('/users/stats', adminUserStatsController);
router.get('/users', adminListUsersController);
router.patch('/users/:id/role', verifyCsrf, adminUpdateUserRoleController);
router.patch('/users/:id/status', verifyCsrf, adminUpdateUserStatusController);
router.post('/users/:id/revoke-sessions', verifyCsrf, adminRevokeUserSessionsController);

// Phase 6: Company Verification, Analytics, Audit Logs, Retention & System Health
router.get('/companies', adminListCompaniesController);
router.patch('/companies/:id/verify', verifyCsrf, adminVerifyCompanyController);
router.get('/analytics', funnelAnalyticsController);
router.get('/audit-logs', adminAuditLogsController);
router.get('/retention', adminListRetentionController);
router.post('/retention', verifyCsrf, adminCreateRetentionController);
router.patch('/retention/:id/hold', verifyCsrf, adminToggleRetentionHoldController);
router.post('/retention/:id/execute', verifyCsrf, adminExecuteRetentionController);
router.get('/system', adminSystemHealthController);

export default router;
