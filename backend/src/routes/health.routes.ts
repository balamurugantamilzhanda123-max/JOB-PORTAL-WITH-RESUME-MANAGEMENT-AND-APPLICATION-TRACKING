import { Router } from 'express';
import { healthController } from '../controllers/health.controller';

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [System]
 *     summary: Check API and PostgreSQL database health
 *     responses:
 *       200:
 *         description: Service and database are healthy
 *       503:
 *         description: Database connection failed
 */
router.get('/', healthController);

export default router;

