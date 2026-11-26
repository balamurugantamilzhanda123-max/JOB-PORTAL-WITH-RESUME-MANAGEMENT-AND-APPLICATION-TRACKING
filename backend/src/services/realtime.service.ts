import { EventEmitter } from 'events';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma/client';

export interface UserRealtimeEvent {
  eventId: string;
  userId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  occurredAt: string;
  payload: Record<string, unknown>;
}

class UserRealtimeBus extends EventEmitter {
  emitToUser(event: UserRealtimeEvent): void {
    this.emit(`user:${event.userId}`, event);
  }

  subscribeUser(userId: string, listener: (event: UserRealtimeEvent) => void): () => void {
    const channel = `user:${userId}`;
    this.on(channel, listener);
    return () => {
      this.off(channel, listener);
    };
  }
}

export const userRealtimeBus = new UserRealtimeBus();
userRealtimeBus.setMaxListeners(500);

export async function recordOutboxEvent(
  tx: Prisma.TransactionClient,
  params: {
    eventType: string;
    aggregateType: string;
    aggregateId: string;
    payload: Prisma.InputJsonValue;
  },
) {
  return tx.outboxEvent.create({
    data: {
      eventType: params.eventType,
      aggregateType: params.aggregateType,
      aggregateId: params.aggregateId,
      payload: params.payload,
      publishedAt: new Date(),
    },
  });
}

export async function writeAuditLog(
  tx: Prisma.TransactionClient | typeof prisma,
  params: {
    actorId?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Prisma.InputJsonValue;
    ipAddress?: string | null;
  },
) {
  return tx.auditLog.create({
    data: {
      actorId: params.actorId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata ?? undefined,
      ipAddress: params.ipAddress ?? null,
    },
  });
}

