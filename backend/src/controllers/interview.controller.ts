import { NextFunction, Request, Response } from 'express';
import {
  listCandidateInterviews,
  listEvaluationsForApplication,
  listRecruiterInterviews,
  proposeInterview,
  respondToInterview,
  submitEvaluationScorecard,
  updateRecruiterInterviewStatus,
} from '../services/interview.service';
import { UnauthorizedError } from '../utils/errors';
import { sendSuccess } from '../utils/response';
import {
  proposeInterviewSchema,
  respondInterviewSchema,
  submitEvaluationSchema,
  updateInterviewStatusSchema,
  uuidParamSchema,
} from '../validators/ats.validator';

export async function proposeInterviewController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { id } = uuidParamSchema.parse(req.params);
    const body = proposeInterviewSchema.parse(req.body);

    const interview = await proposeInterview({
      recruiterId: req.user.id,
      applicationId: id,
      roundTitle: body.roundTitle,
      interviewType: body.interviewType,
      startAt: body.startAt,
      endAt: body.endAt,
      timezone: body.timezone,
      meetingUrl: body.meetingUrl,
      location: body.location,
      instructions: body.instructions,
      ipAddress: req.ip || req.socket.remoteAddress,
    });

    sendSuccess(res, { interview }, 'Interview proposed successfully', 201);
  } catch (error) {
    next(error);
  }
}

export async function listCandidateInterviewsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const interviews = await listCandidateInterviews(req.user.id);
    sendSuccess(res, { interviews }, 'Candidate interviews retrieved', 200);
  } catch (error) {
    next(error);
  }
}

export async function respondInterviewController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { id } = uuidParamSchema.parse(req.params);
    const body = respondInterviewSchema.parse(req.body);

    const interview = await respondToInterview({
      candidateId: req.user.id,
      interviewId: id,
      response: body.response,
      note: body.note,
    });

    sendSuccess(res, { interview }, 'Interview response recorded', 200);
  } catch (error) {
    next(error);
  }
}

export async function listRecruiterInterviewsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const interviews = await listRecruiterInterviews(req.user.id);
    sendSuccess(res, { interviews }, 'Recruiter interviews retrieved', 200);
  } catch (error) {
    next(error);
  }
}

export async function updateRecruiterInterviewStatusController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { id } = uuidParamSchema.parse(req.params);
    const { status } = updateInterviewStatusSchema.parse(req.body);

    const interview = await updateRecruiterInterviewStatus({
      recruiterId: req.user.id,
      interviewId: id,
      status,
    });

    sendSuccess(res, { interview }, 'Interview status updated', 200);
  } catch (error) {
    next(error);
  }
}

export async function submitEvaluationController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { id } = uuidParamSchema.parse(req.params);
    const body = submitEvaluationSchema.parse(req.body);

    const evaluation = await submitEvaluationScorecard({
      reviewerId: req.user.id,
      applicationId: id,
      interviewId: body.interviewId,
      rating: body.rating,
      recommendation: body.recommendation,
      notes: body.notes,
      isCandidateVisible: body.isCandidateVisible,
      criteria: body.criteria,
      ipAddress: req.ip || req.socket.remoteAddress,
    });

    sendSuccess(res, { evaluation }, 'Evaluation scorecard submitted', 201);
  } catch (error) {
    next(error);
  }
}

export async function listEvaluationsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { id } = uuidParamSchema.parse(req.params);

    const evaluations = await listEvaluationsForApplication({
      requesterId: req.user.id,
      requesterRole: req.user.role,
      applicationId: id,
    });

    sendSuccess(res, { evaluations }, 'Evaluations retrieved', 200);
  } catch (error) {
    next(error);
  }
}

