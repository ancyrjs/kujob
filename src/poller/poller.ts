import { WorkingJob } from '../job.js';

export type PollApi = {
  acquireNextJobs(props: { count: number }): Promise<WorkingJob[]>;
  processJob(job: WorkingJob): Promise<void>;
};

/**
 * Represent a strategy for polling jobs from the queue
 */
export interface Poller {
  start(api: PollApi): Promise<void>;
  stop(): Promise<void>;
}
