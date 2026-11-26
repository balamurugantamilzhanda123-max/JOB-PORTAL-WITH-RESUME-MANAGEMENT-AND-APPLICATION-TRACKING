import { CompanyVerificationStatus, JobStatus } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import { prisma } from '../prisma/client';
import {
  getHiringFunnelAnalytics,
  listAuditLogsForAdmin,
} from '../services/analytics.service';
import {
  getRecruiterCompanyProfile,
  listCompaniesForAdmin,
  upsertRecruiterCompanyProfile,
  verifyCompanyByAdmin,
} from '../services/company.service';
import { searchCandidateJobs } from '../services/job.service';
import { NotFoundError, UnauthorizedError } from '../utils/errors';
import { sendSuccess } from '../utils/response';
import {
  companyUpsertSchema,
  companyVerifySchema,
  uuidParamSchema,
} from '../validators/ats.validator';
import { candidateJobSearchQuerySchema, jobIdParamSchema } from '../validators/job.validator';

export async function funnelAnalyticsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const funnel = await getHiringFunnelAnalytics({
      role: req.user.role,
      userId: req.user.id,
    });
    sendSuccess(res, funnel, 'Hiring funnel analytics retrieved', 200);
  } catch (error) {
    next(error);
  }
}

export async function getRecruiterCompanyController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const company = await getRecruiterCompanyProfile(req.user.id);
    sendSuccess(res, { company }, 'Company profile retrieved', 200);
  } catch (error) {
    next(error);
  }
}

export async function upsertRecruiterCompanyController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const body = companyUpsertSchema.parse(req.body);
    const company = await upsertRecruiterCompanyProfile({
      recruiterId: req.user.id,
      ...body,
      ipAddress: req.ip || req.socket.remoteAddress,
    });
    sendSuccess(res, { company }, 'Company profile saved', 200);
  } catch (error) {
    next(error);
  }
}

export async function adminListCompaniesController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const statusParam =
      typeof req.query.status === 'string' ? req.query.status.toUpperCase() : undefined;
    const status =
      statusParam &&
      Object.values(CompanyVerificationStatus).includes(
        statusParam as CompanyVerificationStatus,
      )
        ? (statusParam as CompanyVerificationStatus)
        : undefined;

    const companies = await listCompaniesForAdmin(status);
    sendSuccess(res, { companies }, 'Companies retrieved', 200);
  } catch (error) {
    next(error);
  }
}

export async function adminVerifyCompanyController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { id } = uuidParamSchema.parse(req.params);
    const body = companyVerifySchema.parse(req.body);
    const company = await verifyCompanyByAdmin({
      companyId: id,
      adminId: req.user.id,
      status: body.status,
      reason: body.reason,
      ipAddress: req.ip || req.socket.remoteAddress,
    });
    sendSuccess(res, { company }, `Company status updated to ${body.status}`, 200);
  } catch (error) {
    next(error);
  }
}

export async function adminAuditLogsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const action = typeof req.query.action === 'string' ? req.query.action : undefined;
    const entityType =
      typeof req.query.entityType === 'string' ? req.query.entityType : undefined;

    const logs = await listAuditLogsForAdmin({ action, entityType });
    sendSuccess(res, { logs }, 'Audit logs retrieved', 200);
  } catch (error) {
    next(error);
  }
}

export async function publicJobsSearchController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = candidateJobSearchQuerySchema.parse(req.query);
    const result = await searchCandidateJobs('00000000-0000-0000-0000-000000000000', query);
    sendSuccess(res, result, 'Public published jobs retrieved', 200);
  } catch (error) {
    next(error);
  }
}

export async function publicJobDetailController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = jobIdParamSchema.parse(req.params);
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        screeningQuestions: { orderBy: { orderIndex: 'asc' } },
      },
    });
    if (!job || job.status !== JobStatus.PUBLISHED) {
      throw new NotFoundError('Published job not found');
    }
    sendSuccess(res, { job }, 'Public job details retrieved', 200);
  } catch (error) {
    next(error);
  }
}

