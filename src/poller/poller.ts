import { Job } from '../job.js';

export type PollApi = {
  acquireNextJobs(props: { count: number }): Promise<Job[]>;
  processJob(job: Job): Promise<void>;
};

/**
 * Represent a strategy for polling jobs from the queue
 */
export interface Poller {
  start(api: PollApi): Promise<void>;
  stop(): Promise<void>;
  clone(): Poller;
}
