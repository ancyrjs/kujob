import { BaseJobData, BuiltJob, NonAcquiredJob, RawJob } from './job.js';
import { Processor } from './processor.js';
import { JobBuilder } from './job-builder.js';

export interface Queue {
  createJob<T extends BaseJobData>(data: T): JobBuilder;

  addJob(job: JobBuilder): Promise<BuiltJob>;

  addJobs(jobs: JobBuilder[]): Promise<BuiltJob[]>;

  addRawJob(job: RawJob): Promise<BuiltJob>;

  setProcessor(processor: Processor<any>): void;

  readJob<T extends BaseJobData>(id: string): Promise<NonAcquiredJob<T> | null>;

  startProcessing(): void;

  stopProcessing(): void;

  getName(): string;
}
