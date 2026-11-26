import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './prisma/client';

async function bootstrap() {
  await prisma.$connect();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.info(`🚀 TalentForge ATS Backend running on ${env.BACKEND_URL} (${env.NODE_ENV})`);
    console.info(`📚 Swagger API docs available at ${env.BACKEND_URL}/api/v1/docs`);
  });

  const shutdown = async (signal: string) => {
    console.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch(async (error) => {
  console.error('❌ Failed to start server:', error);
  await prisma.$disconnect();
  process.exit(1);
});

