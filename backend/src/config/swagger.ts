import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'TalentForge ATS API (Phase 1)',
      version: '1.0.0',
      description:
        'Enterprise Recruitment Management & Applicant Tracking System (ATS) REST API - Phase 1 Foundation, Authentication & Role-Based Access Control.',
    },
    servers: [
      {
        url: `${env.BACKEND_URL}/api/v1`,
        description: 'API v1 Server',
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'ats_access_token',
          description: 'HttpOnly JWT access token cookie set upon login or registration',
        },
      },
      schemas: {
        SafeUser: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            fullName: { type: 'string', example: 'Jordan Taylor' },
            email: { type: 'string', format: 'email', example: 'jordan@example.com' },
            role: { type: 'string', enum: ['CANDIDATE', 'RECRUITER', 'ADMIN'] },
            isActive: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        ApiSuccess: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation successful' },
            data: { type: 'object', nullable: true },
          },
        },
        ApiError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Validation failed' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                details: { type: 'object', nullable: true },
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

