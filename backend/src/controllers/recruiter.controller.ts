import { NextFunction, Request, Response } from 'express';
import { getRecruiterDashboardData } from '../services/dashboard.service';
import { UnauthorizedError } from '../utils/errors';
import { sendSuccess } from '../utils/response';

export async function recruiterDashboardController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError();
    }
    const dashboard = await getRecruiterDashboardData(req.user.id);
    sendSuccess(res, dashboard, 'Recruiter dashboard retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
}

