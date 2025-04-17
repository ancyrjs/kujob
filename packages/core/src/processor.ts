import { AcquiredJob, JobData } from './job-contract.js';

export interface Processor<T extends JobData = any> {
  process(job: AcquiredJob<T>): Promise<void>;

  getConcurrency(): number;
}
