import { BuiltJob, JobData, NonAcquiredJob } from './job-contract.js';
import { Processor } from './processor.js';
import { JobBuilder } from './job-builder.js';
import { Looper } from './looper/looper.js';

export interface Queue {
  createJob<T extends JobData>(data: T): JobBuilder;

  addJob(job: JobBuilder): Promise<BuiltJob>;

  addJobs(jobs: JobBuilder[]): Promise<BuiltJob[]>;

  setProcessor(processor: Processor<any>): void;

  readJob<T extends JobData>(id: string): Promise<NonAcquiredJob<T> | null>;

  startProcessing(): void;

  stopProcessing(): void;

  getName(): string;

  setLooper(looper: Looper): void;
}
