import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env, isOriginAllowed } from './config/env';
import { swaggerSpec } from './config/swagger';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { apiRateLimiter } from './middleware/rateLimit.middleware';
import apiV1Router from './routes';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use((req, res, next) => {
    const requestHost = req.get('x-forwarded-host') || req.get('host');
    return cors({
      origin(requestOrigin, callback) {
        if (!requestOrigin || isOriginAllowed(requestOrigin, requestHost)) {
          callback(null, true);
          return;
        }
        callback(new Error(`Origin ${requestOrigin} not allowed by CORS`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'Authorization'],
    })(req, res, next);
  });

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  app.use('/api/v1', (req, res, next) => {
    if (env.CONFIG_ERRORS && req.path !== '/health') {
      res.status(503).json({
        success: false,
        message:
          'Server environment is incomplete. Configure DATABASE_URL, JWT_ACCESS_SECRET, and JWT_REFRESH_SECRET in Vercel Project Settings.',
        error: {
          code: 'ENV_NOT_CONFIGURED',
          details: Object.keys(env.CONFIG_ERRORS),
        },
      });
      return;
    }
    next();
  });

  app.use('/api/v1', apiRateLimiter);

  // OpenAPI / Swagger documentation
  app.get('/api/v1/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Versioned REST API routes
  app.use('/api/v1', apiV1Router);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

