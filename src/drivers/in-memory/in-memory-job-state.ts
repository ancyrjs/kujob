import { BaseJobData, JobStatus } from '../../core/job.js';

export type InMemoryJobState<T extends BaseJobData = BaseJobData> = {
  id: string;
  data: T;
  attempts: number;
  priority: number;
  status: JobStatus;
  createdAt: Date;
  startedAt: Date | null;
  scheduledAt: Date;
  updatedAt: Date | null;
  finishedAt: Date | null;
  failureReason: string | null;
};
