import { NextFunction, Request, Response } from 'express';
import {
  createBookmark,
  deleteBookmark,
  listCandidateBookmarks,
} from '../services/job.service';
import { UnauthorizedError } from '../utils/errors';
import { sendSuccess } from '../utils/response';
import { bookmarkJobIdParamSchema } from '../validators/job.validator';

export async function listBookmarksController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const bookmarks = await listCandidateBookmarks(req.user.id);
    sendSuccess(res, { bookmarks }, 'Saved jobs retrieved', 200);
  } catch (error) {
    next(error);
  }
}

export async function addBookmarkController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { jobId } = bookmarkJobIdParamSchema.parse(req.params);
    const bookmark = await createBookmark(req.user.id, jobId);
    sendSuccess(res, { bookmark }, 'Job bookmarked successfully', 201);
  } catch (error) {
    next(error);
  }
}

export async function removeBookmarkController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { jobId } = bookmarkJobIdParamSchema.parse(req.params);
    await deleteBookmark(req.user.id, jobId);
    sendSuccess(res, null, 'Bookmark removed successfully', 200);
  } catch (error) {
    next(error);
  }
}

