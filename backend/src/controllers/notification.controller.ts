import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import {
  listUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notification.service';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '../services/profile.service';
import { userRealtimeBus } from '../services/realtime.service';
import { UnauthorizedError } from '../utils/errors';
import { sendSuccess } from '../utils/response';
import { uuidParamSchema } from '../validators/ats.validator';
import { notificationPreferencesSchema } from '../validators/auth.validator';

export async function listNotificationsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const data = await listUserNotifications(req.user.id);
    sendSuccess(res, data, 'Notifications retrieved', 200);
  } catch (error) {
    next(error);
  }
}

export async function markNotificationReadController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { id } = uuidParamSchema.parse(req.params);
    const notification = await markNotificationRead(req.user.id, id);
    sendSuccess(res, { notification }, 'Notification marked as read', 200);
  } catch (error) {
    next(error);
  }
}

export async function markAllNotificationsReadController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    await markAllNotificationsRead(req.user.id);
    sendSuccess(res, null, 'All notifications marked as read', 200);
  } catch (error) {
    next(error);
  }
}

export async function getNotificationPreferencesController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const preferences = await getNotificationPreferences(req.user.id);
    sendSuccess(res, { preferences }, 'Notification preferences retrieved', 200);
  } catch (error) {
    next(error);
  }
}

export async function updateNotificationPreferencesController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const body = notificationPreferencesSchema.parse(req.body);
    const preferences = await updateNotificationPreferences(req.user.id, body);
    sendSuccess(res, { preferences }, 'Notification preferences updated', 200);
  } catch (error) {
    next(error);
  }
}

export function userEventsStreamController(req: Request, res: Response): void {
  if (!req.user) {
    res.status(401).end();
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const sendEvent = (eventName: string, data: unknown) => {
    if (res.writableEnded) return;
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  res.write('retry: 5000\n\n');
  sendEvent('connected', { userId: req.user.id, timestamp: new Date().toISOString() });

  const unsubscribe = userRealtimeBus.subscribeUser(req.user.id, (payload) => {
    sendEvent(payload.eventType, payload);
  });

  const heartbeat = setInterval(() => {
    if (!res.writableEnded) {
      res.write(': keep-alive\n\n');
    }
  }, 20000);

  let maxStreamTimer: ReturnType<typeof setTimeout> | null = null;
  const cleanup = () => {
    clearInterval(heartbeat);
    if (maxStreamTimer) clearTimeout(maxStreamTimer);
    unsubscribe();
    if (!res.writableEnded) {
      res.end();
    }
  };

  if (env.IS_VERCEL) {
    maxStreamTimer = setTimeout(cleanup, 55000);
  }

  req.on('close', cleanup);
}

