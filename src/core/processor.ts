import { BaseJobData, Job } from './job.js';

export interface Processor<T extends BaseJobData = any> {
  process(job: Job<T>): Promise<void>;

  getConcurrency(): number;
}
