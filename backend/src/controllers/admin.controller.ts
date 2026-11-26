import { UserRole } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import {
  getAdminDashboardData,
  getAdminUserStats,
  listUsersForAdmin,
  updateUserRoleByAdmin,
  updateUserStatusByAdmin,
} from '../services/admin.service';
import { UnauthorizedError } from '../utils/errors';
import { sendSuccess } from '../utils/response';
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

