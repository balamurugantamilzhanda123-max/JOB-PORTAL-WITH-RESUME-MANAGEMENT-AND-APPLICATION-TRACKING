import { NextFunction, Request, Response } from 'express';
import {
  deleteCandidateResume,
  getAuthorizedResumeDownload,
  getCandidateResumeById,
  getResumeReadinessForJob,
  listCandidateResumes,
  reparseCandidateResume,
  setDefaultCandidateResume,
  updateCandidateResume,
  uploadAndParseResume,
} from '../services/resume.service';
import { BadRequestError, UnauthorizedError } from '../utils/errors';
import { sendSuccess } from '../utils/response';
import {
  jobIdParamOnlySchema,
  resumeCorrectionSchema,
  uuidParamSchema,
} from '../validators/ats.validator';

export async function uploadResumeController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    if (!req.file) {
      throw new BadRequestError('Please upload a PDF or DOCX resume file.');
    }

    const title = typeof req.body?.title === 'string' ? req.body.title : undefined;
    const setAsDefault =
      req.body?.isDefault === 'true' || req.body?.isDefault === true;

    const resume = await uploadAndParseResume({
      userId: req.user.id,
      title,
      setAsDefault,
      file: req.file,
      ipAddress: req.ip || req.socket.remoteAddress,
    });

    sendSuccess(res, { resume }, 'Resume uploaded and parsed successfully', 201);
  } catch (error) {
    next(error);
  }
}

export async function listResumesController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const resumes = await listCandidateResumes(req.user.id);
    sendSuccess(res, { resumes }, 'Resumes retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
}

export async function getResumeDetailController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { id } = uuidParamSchema.parse(req.params);
    const resume = await getCandidateResumeById(req.user.id, id);
    sendSuccess(res, { resume }, 'Resume retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
}

export async function updateResumeController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { id } = uuidParamSchema.parse(req.params);
    const body = resumeCorrectionSchema.parse(req.body);
    const resume = await updateCandidateResume(
      req.user.id,
      id,
      body,
      req.ip || req.socket.remoteAddress,
    );
    sendSuccess(res, { resume }, 'Resume details updated', 200);
  } catch (error) {
    next(error);
  }
}

export async function setDefaultResumeController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { id } = uuidParamSchema.parse(req.params);
    const resume = await setDefaultCandidateResume(req.user.id, id);
    sendSuccess(res, { resume }, 'Default resume updated', 200);
  } catch (error) {
    next(error);
  }
}

export async function reparseResumeController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { id } = uuidParamSchema.parse(req.params);
    const resume = await reparseCandidateResume(req.user.id, id);
    sendSuccess(res, { resume }, 'Resume reparsed successfully', 200);
  } catch (error) {
    next(error);
  }
}

export async function deleteResumeController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { id } = uuidParamSchema.parse(req.params);
    await deleteCandidateResume(req.user.id, id);
    sendSuccess(res, null, 'Resume deleted successfully', 200);
  } catch (error) {
    next(error);
  }
}

export async function downloadResumeController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { id } = uuidParamSchema.parse(req.params);
    const file = await getAuthorizedResumeDownload({
      resumeId: id,
      requesterId: req.user.id,
      requesterRole: req.user.role,
      ipAddress: req.ip || req.socket.remoteAddress,
    });

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(file.fileName)}"`,
    );
    res.setHeader('Content-Length', String(file.buffer.byteLength));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(file.buffer);
  } catch (error) {
    next(error);
  }
}

export async function resumeReadinessController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { jobId } = jobIdParamOnlySchema.parse(req.params);
    const resumeId = typeof req.query.resumeId === 'string' ? req.query.resumeId : undefined;
    const readiness = await getResumeReadinessForJob({
      candidateId: req.user.id,
      jobId,
      resumeId,
    });
    sendSuccess(res, readiness, 'ATS keyword readiness computed', 200);
  } catch (error) {
    next(error);
  }
}

