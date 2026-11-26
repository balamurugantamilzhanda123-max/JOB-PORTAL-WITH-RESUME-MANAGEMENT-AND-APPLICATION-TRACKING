import { NextFunction, Request, Response } from 'express';
import { checkDatabaseHealth } from '../prisma/client';

export async function healthController(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const db = await checkDatabaseHealth();
    const statusCode = db.connected ? 200 : 503;

    res.status(statusCode).json({
      success: db.connected,
      message: db.connected ? 'Service is healthy' : 'Database connection unavailable',
      data: {
        status: db.connected ? 'ok' : 'degraded',
        database: db.connected ? 'connected' : 'disconnected',
        latencyMs: db.latencyMs,
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

