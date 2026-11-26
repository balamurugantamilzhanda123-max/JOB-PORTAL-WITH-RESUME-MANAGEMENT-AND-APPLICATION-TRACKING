import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

const isTest = env.NODE_ENV === 'test';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: isTest ? 1000 : 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
    error: {
      code: 'RATE_LIMITED',
    },
  },
});

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTest ? 2000 : 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please slow down and try again shortly.',
    error: {
      code: 'RATE_LIMITED',
    },
  },
});

export const searchRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: isTest ? 2000 : 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Search rate limit exceeded. Please pause briefly before searching again.',
    error: {
      code: 'SEARCH_RATE_LIMITED',
    },
  },
});

