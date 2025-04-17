import { ScheduleStrategy } from './schedule/schedule-strategy.js';
import { BackoffStrategy } from './backoff/backoff-strategy.js';

export type JobData = Record<string, any>;
export type JobStatus = 'waiting' | 'processing' | 'completed' | 'failed';

/**
 * Represent a job that has not been acquired
 * Such a job cannot be processed because whoever got this handle has no guarantee
 * that the job is acquired.
 * Mainly used for reading.
 */
export interface NonAcquiredJob<T extends JobData = JobData> {
  getId(): string;
  getData(): T;
  isWaiting(): boolean;
  isProcessing(): boolean;
  isCompleted(): boolean;
  isFailed(): boolean;
  getFailureReason(): string | null;
  createdAt(): Date;
  startedAt(): Date | null;
  scheduledAt(): Date | null;
  finishedAt(): Date | null;
  updatedAt(): Date | null;
  remainingAttempts(): number;
}

/**
 * Acquired job. Such a job data can be processed
 * and updated.
 */
export interface AcquiredJob<T extends JobData = JobData>
  extends NonAcquiredJob<T> {
  complete(): Promise<void>;
  fail(reason: any): Promise<void>;
}

/**
 * Result of creating a job
 */
export type BuiltJob = {
  id: string;
};

/**
 * Specification of a job
 */
export type JobSpec<T extends JobData = JobData> = {
  id: string | null;
  data: T;
  attempts: number;
  schedule: ScheduleStrategy;
  backoff: BackoffStrategy;
  priority: number;
};
