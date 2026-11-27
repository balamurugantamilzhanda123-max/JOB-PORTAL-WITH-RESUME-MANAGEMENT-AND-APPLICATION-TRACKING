import { NextFunction, Request, Response } from 'express';
import {
  getCandidateApplicationDetail,
  getRecruiterApplicationDetail,
  getRecruiterPipelineOverview,
  listCandidateApplications,
  listRecruiterApplicationsForJob,
  submitApplication,
  transitionApplicationStage,
} from '../services/application.service';
import { UnauthorizedError } from '../utils/errors';
import { sendSuccess } from '../utils/response';
import {
  applicationStageTransitionSchema,
  jobIdParamOnlySchema,
  submitApplicationSchema,
  uuidParamSchema,
} from '../validators/ats.validator';

export async function submitApplicationController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { jobId } = jobIdParamOnlySchema.parse(req.params);
    const body = submitApplicationSchema.parse(req.body);
    const headerKey = req.get('x-idempotency-key');

    const application = await submitApplication({
      candidateId: req.user.id,
      jobId,
      resumeId: body.resumeId,
      coverNote: body.coverNote,
      idempotencyKey: body.idempotencyKey || headerKey,
      screeningAnswers: body.screeningAnswers,
      ipAddress: req.ip || req.socket.remoteAddress,
    });

    sendSuccess(res, { application }, 'Application submitted successfully', 201);
  } catch (error) {
    next(error);
  }
}

export async function listMyApplicationsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const applications = await listCandidateApplications(req.user.id);
    sendSuccess(res, { applications }, 'Candidate applications retrieved', 200);
  } catch (error) {
    next(error);
  }
}

export async function getMyApplicationDetailController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { id } = uuidParamSchema.parse(req.params);
    const application = await getCandidateApplicationDetail(req.user.id, id);
    sendSuccess(res, { application }, 'Application details retrieved', 200);
  } catch (error) {
    next(error);
  }
}

export async function listJobApplicantsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { jobId } = jobIdParamOnlySchema.parse(req.params);
    const data = await listRecruiterApplicationsForJob(req.user.id, jobId);
    sendSuccess(res, data, 'Job applicants retrieved', 200);
  } catch (error) {
    next(error);
  }
}

export async function recruiterPipelineController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const applications = await getRecruiterPipelineOverview(req.user.id);
    sendSuccess(res, { applications }, 'Recruiter ATS pipeline retrieved', 200);
  } catch (error) {
    next(error);
  }
}

export async function getRecruiterApplicationDetailController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { id } = uuidParamSchema.parse(req.params);
    const application = await getRecruiterApplicationDetail(req.user.id, id);
    sendSuccess(res, { application }, 'Recruiter application detail retrieved', 200);
  } catch (error) {
    next(error);
  }
}

export async function transitionApplicationStageController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { id } = uuidParamSchema.parse(req.params);
    const body = applicationStageTransitionSchema.parse(req.body);

    const application = await transitionApplicationStage({
      recruiterId: req.user.id,
      applicationId: id,
      targetStage: body.stage,
      publicNote: body.publicNote,
      internalNote: body.internalNote,
      ipAddress: req.ip || req.socket.remoteAddress,
    });

    sendSuccess(res, { application }, `Application moved to ${body.stage}`, 200);
  } catch (error) {
    next(error);
  }
}

