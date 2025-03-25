import {
  BackoffStrategy,
  BaseJobData,
  JobStatus,
  ScheduleStrategy,
} from '@ancyrjs/kujob-core';

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
