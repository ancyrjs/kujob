import { randomUUID } from 'crypto';
import { Queue } from '../../core/queue.js';
import {
  BaseJobData,
  BuiltJob,
  NonAcquiredJob,
  RawJob,
} from '../../core/job.js';
import { Processor } from '../../core/processor.js';
import { CreateQueueParams } from '../../core/driver.js';
import { JobBuilder } from '../../core/job-builder.js';
import { InMemoryJobState } from './in-memory-job-state.js';
import { InMemoryJob } from './in-memory-job.js';

const randomId = () => randomUUID();

export class InMemoryQueue implements Queue {
  private name: string;
  private queue: InMemoryJobState[] = [];
  private processor: Processor | null = null;

  constructor(props: CreateQueueParams) {
    this.name = props.name;
  }

  createJob<T extends BaseJobData>(data: T): JobBuilder {
    return new JobBuilder({
      data,
      queue: this,
    });
  }

  async addJob(job: JobBuilder): Promise<BuiltJob> {
    return this.addRawJob(job.raw());
  }

  async addJobs(jobs: JobBuilder[]): Promise<BuiltJob[]> {
    return Promise.all(jobs.map((job) => this.addJob(job)));
  }

  async addRawJob(raw: RawJob): Promise<BuiltJob> {
    const job: InMemoryJobState = {
      ...raw,
      id: raw.id ?? randomId(),
      status: 'waiting',
      createdAt: new Date(),
      startedAt: null,
      updatedAt: null,
      finishedAt: null,
      failureReason: null,
    };

    this.queue.push(job);

    return {
      id: job.id,
    };
  }

  async readJob<T extends BaseJobData>(
    id: string,
  ): Promise<NonAcquiredJob<T> | null> {
    const entry = this.queue.find((job) => job.id === id);
    if (!entry) {
      return null;
    }

    return new InMemoryJob({ state: entry as InMemoryJobState<T> });
  }

  setProcessor(processor: Processor): void {
    this.processor = processor;
  }

  startProcessing(): void {
    if (!this.processor) {
      throw new Error('Processor is not set');
    }

    // Prevent the processor from being erased by the time it is called
    const processor = this.processor;

    this.queue
      .filter((job) => job.status === 'waiting')
      .forEach(async (state) => {
        state.status = 'processing';
        state.startedAt = new Date();
        const acquiredJob = new InMemoryJob({ state });

        setImmediate(async () => {
          try {
            await processor.process(acquiredJob);
            await acquiredJob.complete();
          } catch (e) {
            await acquiredJob.fail(e);
          }
        });
      });
  }

  stopProcessing(): void {
    // Do nothing
  }

  getName(): string {
    return this.name;
  }
}
