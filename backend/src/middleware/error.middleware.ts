import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { AppError } from '../utils/errors';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404, 'ROUTE_NOT_FOUND'));
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const key = issue.path.join('.') || 'root';
      if (!fieldErrors[key]) fieldErrors[key] = [];
      fieldErrors[key].push(issue.message);
    }

    res.status(400).json({
      success: false,
      message: err.issues[0]?.message || 'Validation failed',
      error: {
        code: 'VALIDATION_ERROR',
        details: fieldErrors,
      },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: {
        code: err.code,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({
        success: false,
        message: 'A record with this unique value already exists',
        error: { code: 'CONFLICT' },
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        message: 'Requested record was not found',
        error: { code: 'NOT_FOUND' },
      });
      return;
    }
  }

  if (env.NODE_ENV !== 'test') {
    console.error('Unhandled error:', err);
  }

  res.status(500).json({
    success: false,
    message: 'An unexpected internal error occurred',
    error: {
      code: 'INTERNAL_SERVER_ERROR',
    },
  });
}

