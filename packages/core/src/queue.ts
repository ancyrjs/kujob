import { BaseJobData, BuiltJob, JobSpec, NonAcquiredJob } from './job.js';
import { Processor } from './processor.js';
import { JobBuilder } from './job-builder.js';
import { Looper } from './looper/looper.js';

export interface Queue {
  createJob<T extends BaseJobData>(data: T): JobBuilder;

  addJob(job: JobBuilder): Promise<BuiltJob>;

  addJobs(jobs: JobBuilder[]): Promise<BuiltJob[]>;

  addJobSpec(job: JobSpec): Promise<BuiltJob>;

  setProcessor(processor: Processor<any>): void;

  readJob<T extends BaseJobData>(id: string): Promise<NonAcquiredJob<T> | null>;

  startProcessing(): void;

  stopProcessing(): void;

  getName(): string;

  setLooper(looper: Looper): void;
}
