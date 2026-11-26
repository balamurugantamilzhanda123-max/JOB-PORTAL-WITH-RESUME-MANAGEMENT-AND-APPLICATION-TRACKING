import { Router } from 'express';
import {
  loginController,
  logoutController,
  meController,
  refreshController,
  registerController,
} from '../controllers/auth.controller';
import { authenticate, verifyCsrf } from '../middleware/auth.middleware';
import { authRateLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new Candidate or Recruiter account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, email, password, confirmPassword, role]
 *             properties:
 *               fullName: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *               confirmPassword: { type: string, format: password }
 *               role: { type: string, enum: [CANDIDATE, RECRUITER] }
 *     responses:
 *       201:
 *         description: Registered successfully (sets HttpOnly auth cookies)
 *       400:
 *         description: Validation error
 *       403:
 *         description: Public ADMIN registration is prohibited
 *       409:
 *         description: Email already exists
 */
router.post('/register', authRateLimiter, verifyCsrf, registerController);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Authenticate user and issue HttpOnly access & refresh cookies
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *               rememberMe: { type: boolean }
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', authRateLimiter, verifyCsrf, loginController);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Authentication]
 *     summary: Rotate refresh token and issue a fresh access token cookie
 *     responses:
 *       200:
 *         description: Session refreshed
 *       401:
 *         description: Invalid, expired, or reused refresh token
 */
router.post('/refresh', authRateLimiter, verifyCsrf, refreshController);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Revoke current refresh session and clear authentication cookies
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post('/logout', verifyCsrf, logoutController);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Authentication]
 *     summary: Retrieve the currently authenticated user's profile
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *       401:
 *         description: Unauthenticated
 */
router.get('/me', authenticate, meController);

export default router;

