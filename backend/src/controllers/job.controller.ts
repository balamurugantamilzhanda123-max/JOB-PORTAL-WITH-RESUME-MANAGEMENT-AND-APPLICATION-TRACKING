import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import {
  createRecruiterJob,
  getPublishedJobForCandidate,
  getRecruiterJobById,
  getRecruiterJobStats,
  listRecruiterJobs,
  searchCandidateJobs,
  transitionRecruiterJobStatus,
  updateRecruiterJob,
} from '../services/job.service';
import { jobEventBus } from '../services/jobEvents.service';
import { UnauthorizedError } from '../utils/errors';
import { sendSuccess } from '../utils/response';
import {
  candidateJobSearchQuerySchema,
  jobIdParamSchema,
  jobPayloadSchema,
  recruiterJobsQuerySchema,
  updateJobStatusSchema,
} from '../validators/job.validator';

export async function recruiterJobStatsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const stats = await getRecruiterJobStats(req.user.id);
    sendSuccess(res, stats, 'Recruiter job statistics retrieved', 200);
  } catch (error) {
    next(error);
  }
}

export async function listRecruiterJobsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const query = recruiterJobsQuerySchema.parse(req.query);
    const result = await listRecruiterJobs(req.user.id, query);
    sendSuccess(res, result, 'Recruiter job listings retrieved', 200);
  } catch (error) {
    next(error);
  }
}

export async function getRecruiterJobController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { id } = jobIdParamSchema.parse(req.params);
    const job = await getRecruiterJobById(req.user.id, id);
    sendSuccess(res, { job }, 'Job posting retrieved', 200);
  } catch (error) {
    next(error);
  }
}

export async function createRecruiterJobController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const payload = jobPayloadSchema.parse(req.body);
    const job = await createRecruiterJob(req.user.id, payload);
    sendSuccess(
      res,
      { job },
      job.status === 'PUBLISHED' ? 'Job published successfully' : 'Job saved as draft',
      201,
    );
  } catch (error) {
    next(error);
  }
}

export async function updateRecruiterJobController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { id } = jobIdParamSchema.parse(req.params);
    const payload = jobPayloadSchema.parse(req.body);
    const job = await updateRecruiterJob(req.user.id, id, payload);
    sendSuccess(res, { job }, 'Job posting updated successfully', 200);
  } catch (error) {
    next(error);
  }
}

export async function updateRecruiterJobStatusController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { id } = jobIdParamSchema.parse(req.params);
    const { status, reason } = updateJobStatusSchema.parse(req.body);
    const job = await transitionRecruiterJobStatus(req.user.id, id, status, reason);
    sendSuccess(res, { job }, `Job status updated to ${status}`, 200);
  } catch (error) {
    next(error);
  }
}

export async function searchCandidateJobsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const query = candidateJobSearchQuerySchema.parse(req.query);
    const result = await searchCandidateJobs(req.user.id, query);
    sendSuccess(res, result, 'Published jobs retrieved', 200);
  } catch (error) {
    next(error);
  }
}

export async function getCandidateJobDetailController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { id } = jobIdParamSchema.parse(req.params);
    const job = await getPublishedJobForCandidate(req.user.id, id);
    sendSuccess(res, { job }, 'Job details retrieved', 200);
  } catch (error) {
    next(error);
  }
}

export function candidateJobStreamController(req: Request, res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const sendEvent = (eventName: string, data: unknown) => {
    if (res.writableEnded) return;
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  res.write('retry: 5000\n\n');
  sendEvent('connected', { timestamp: new Date().toISOString() });

  const unsubscribe = jobEventBus.subscribe((payload) => {
    sendEvent(payload.type, payload);
  });

  const heartbeat = setInterval(() => {
    if (!res.writableEnded) {
      res.write(': keep-alive\n\n');
    }
  }, 20000);

  let maxStreamTimer: ReturnType<typeof setTimeout> | null = null;
  const cleanup = () => {
    clearInterval(heartbeat);
    if (maxStreamTimer) clearTimeout(maxStreamTimer);
    unsubscribe();
    if (!res.writableEnded) {
      res.end();
    }
  };

  // Close SSE cleanly before Vercel serverless function maxDuration so EventSource reconnects
  if (env.IS_VERCEL) {
    maxStreamTimer = setTimeout(cleanup, 55000);
  }

  req.on('close', cleanup);
}

