import { UserRole } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import {
  createRetentionJobByAdmin,
  executeRetentionJobByAdmin,
  getAdminDashboardData,
  getAdminUserStats,
  getSystemDiagnosticsForAdmin,
  listRetentionJobsForAdmin,
  listUsersForAdmin,
  revokeAllUserSessionsByAdmin,
  toggleRetentionHoldByAdmin,
  updateUserRoleByAdmin,
  updateUserStatusByAdmin,
} from '../services/admin.service';
import { UnauthorizedError } from '../utils/errors';
import { sendSuccess } from '../utils/response';
import {
  adminActionReasonSchema,
  retentionCreateSchema,
  retentionHoldSchema,
  uuidParamSchema,
} from '../validators/ats.validator';
import {
  updateUserRoleSchema,
  updateUserStatusSchema,
  userIdParamSchema,
} from '../validators/admin.validator';

export async function adminDashboardController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError();
    }
    const dashboard = await getAdminDashboardData(req.user);
    sendSuccess(res, dashboard, 'Admin dashboard retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
}

export async function adminUserStatsController(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const stats = await getAdminUserStats();
    sendSuccess(res, stats, 'User statistics retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
}

export async function adminListUsersController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const roleParam = typeof req.query.role === 'string' ? req.query.role.toUpperCase() : undefined;
    const role =
      roleParam && Object.values(UserRole).includes(roleParam as UserRole)
        ? (roleParam as UserRole)
        : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    const users = await listUsersForAdmin({ role, search });
    sendSuccess(res, { users }, 'Users retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
}

export async function adminUpdateUserRoleController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError();
    }
    const { id } = userIdParamSchema.parse(req.params);
    const { role } = updateUserRoleSchema.parse(req.body);

    const updatedUser = await updateUserRoleByAdmin(id, role, req.user.id);
    sendSuccess(res, { user: updatedUser }, 'User role updated successfully', 200);
  } catch (error) {
    next(error);
  }
}

export async function adminUpdateUserStatusController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError();
    }
    const { id } = userIdParamSchema.parse(req.params);
    const { isActive } = updateUserStatusSchema.parse(req.body);

    const updatedUser = await updateUserStatusByAdmin(id, isActive, req.user.id);
    sendSuccess(res, { user: updatedUser }, 'User status updated successfully', 200);
  } catch (error) {
    next(error);
  }
}

export async function adminRevokeUserSessionsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { id } = userIdParamSchema.parse(req.params);
    const body = adminActionReasonSchema.parse(req.body ?? {});
    const result = await revokeAllUserSessionsByAdmin({
      targetUserId: id,
      actingAdminId: req.user.id,
      reason: body.reason,
      ipAddress: req.ip || req.socket.remoteAddress,
    });
    sendSuccess(res, result, 'Active user sessions revoked', 200);
  } catch (error) {
    next(error);
  }
}

export async function adminListRetentionController(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const jobs = await listRetentionJobsForAdmin();
    sendSuccess(res, { jobs }, 'Retention jobs retrieved', 200);
  } catch (error) {
    next(error);
  }
}

export async function adminCreateRetentionController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const body = retentionCreateSchema.parse(req.body);
    const job = await createRetentionJobByAdmin({
      adminId: req.user.id,
      ...body,
      ipAddress: req.ip || req.socket.remoteAddress,
    });
    sendSuccess(res, { job }, 'Retention policy job scheduled', 201);
  } catch (error) {
    next(error);
  }
}

export async function adminToggleRetentionHoldController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { id } = uuidParamSchema.parse(req.params);
    const body = retentionHoldSchema.parse(req.body);
    const job = await toggleRetentionHoldByAdmin({
      adminId: req.user.id,
      retentionJobId: id,
      hold: body.hold,
      holdReason: body.holdReason,
      ipAddress: req.ip || req.socket.remoteAddress,
    });
    sendSuccess(res, { job }, 'Retention hold updated', 200);
  } catch (error) {
    next(error);
  }
}

export async function adminExecuteRetentionController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { id } = uuidParamSchema.parse(req.params);
    const job = await executeRetentionJobByAdmin({
      adminId: req.user.id,
      retentionJobId: id,
      ipAddress: req.ip || req.socket.remoteAddress,
    });
    sendSuccess(res, { job }, 'Retention job executed', 200);
  } catch (error) {
    next(error);
  }
}

export async function adminSystemHealthController(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const diagnostics = await getSystemDiagnosticsForAdmin();
    sendSuccess(res, diagnostics, 'System diagnostics retrieved', 200);
  } catch (error) {
    next(error);
  }
}

