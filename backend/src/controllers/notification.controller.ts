import { NextFunction, Request, Response } from 'express';
import {
  listUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notification.service';
import { userRealtimeBus } from '../services/realtime.service';
import { UnauthorizedError } from '../utils/errors';
import { sendSuccess } from '../utils/response';
import { uuidParamSchema } from '../validators/ats.validator';

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
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  sendEvent('connected', { userId: req.user.id, timestamp: new Date().toISOString() });

  const unsubscribe = userRealtimeBus.subscribeUser(req.user.id, (payload) => {
    sendEvent(payload.eventType, payload);
  });

  const heartbeat = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
    res.end();
  });
}

