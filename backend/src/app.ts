import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
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

  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'Authorization'],
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

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

