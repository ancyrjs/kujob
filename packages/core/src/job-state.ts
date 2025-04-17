import { JobData, JobStatus } from './job-contract.js';
import { BackoffStrategy } from './backoff/backoff-strategy.js';
import { ScheduleStrategy } from './schedule/schedule-strategy.js';

export type JobState<T extends JobData = JobData> = {
  id: string;
  queueName: string;
  workerId: string | null;
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
