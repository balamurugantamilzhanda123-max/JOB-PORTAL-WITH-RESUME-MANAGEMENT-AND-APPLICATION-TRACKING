import { prisma } from '../prisma/client';
import { ForbiddenError, NotFoundError } from '../utils/errors';

export async function listUserNotifications(userId: string) {
  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.notification.count({
      where: { userId, readAt: null },
    }),
  ]);

  return { items, unreadCount };
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });
  if (!notification) throw new NotFoundError('Notification not found');
  if (notification.userId !== userId) throw new ForbiddenError('Access denied');

  return prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: notification.readAt ?? new Date() },
  });
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

