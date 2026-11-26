import { NextFunction, Request, Response } from 'express';
import { getCandidateDashboardData } from '../services/dashboard.service';
import { UnauthorizedError } from '../utils/errors';
import { sendSuccess } from '../utils/response';

export async function candidateDashboardController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError();
    }
    const dashboard = await getCandidateDashboardData(req.user.id);
    sendSuccess(res, dashboard, 'Candidate dashboard retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
}

