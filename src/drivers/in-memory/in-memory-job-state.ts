import { BaseJobData, JobStatus } from '../../core/job.js';
import { ScheduleStrategy } from '../../core/schedule/schedule-strategy.js';
import { BackoffStrategy } from '../../core/backoff/backoff-strategy.js';

export type InMemoryJobState<T extends BaseJobData = BaseJobData> = {
  id: string;
  data: T;
  attemptsMax: number;
  attemptsDone: number;
  priority: number;
  backoff: BackoffStrategy;
  schedule: ScheduleStrategy;
  status: JobStatus;
  createdAt: Date;
  startedAt: Date | null;
  scheduledAt: Date;
  updatedAt: Date | null;
  finishedAt: Date | null;
  failureReason: string | null;
};
