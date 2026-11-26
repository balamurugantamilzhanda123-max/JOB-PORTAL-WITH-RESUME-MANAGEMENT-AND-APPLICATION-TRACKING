import { EventEmitter } from 'events';
import { EmploymentType, JobStatus, WorkMode } from '@prisma/client';

export type JobEventType = 'job.published' | 'job.updated' | 'job.paused' | 'job.closed';

export interface PublicJobEventPayload {
  type: JobEventType;
  jobId: string;
  timestamp: string;
  job?: {
    id: string;
    title: string;
    company: string;
    location: string;
    workMode: WorkMode;
    employmentType: EmploymentType;
    status: JobStatus;
    publishedAt: string | null;
  };
}

class JobEventBus extends EventEmitter {
  emitJobEvent(payload: PublicJobEventPayload): void {
    this.emit('job-event', payload);
  }

  subscribe(listener: (payload: PublicJobEventPayload) => void): () => void {
    this.on('job-event', listener);
    return () => {
      this.off('job-event', listener);
    };
  }
}

export const jobEventBus = new JobEventBus();
jobEventBus.setMaxListeners(200);

