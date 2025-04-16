import { BaseJobData, JobStatus } from './job.js';
import { BackoffStrategy } from './backoff/backoff-strategy.js';
import { ScheduleStrategy } from './schedule/schedule-strategy.js';

export type DefaultJobState<T extends BaseJobData = BaseJobData> = {
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
