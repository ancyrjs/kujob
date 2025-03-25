import {
  BaseJobData,
  BuiltJob,
  CreateQueueParams,
  DateProvider,
  JobBuilder,
  JobSpec,
  Looper,
  NonAcquiredJob,
  Processor,
  Queue,
} from '@ancyrjs/kujob-core';
import { InMemoryJobState } from './in-memory-job-state.js';
import { InMemoryJob } from './in-memory-job.js';

export class InMemoryQueue implements Queue {
  private name: string;
  private queue: InMemoryJobState[] = [];
  private processor: Processor | null = null;
  private jobsLooper: Looper;
  private dateProvider: DateProvider;

  constructor(props: {
    params: CreateQueueParams;
    jobsLooper: Looper;
    dateProvider: DateProvider;
  }) {
    this.name = props.params.name;
    this.jobsLooper = props.jobsLooper;
    this.dateProvider = props.dateProvider;

    this.jobsLooper.configure(() => this.processJobs());
  }

  getName(): string {
    return this.name;
  }

  createJob<T extends BaseJobData>(data: T): JobBuilder {
    return new JobBuilder({
      data,
      queue: this,
    });
  }

  async addJob(job: JobBuilder): Promise<BuiltJob> {
    const result = await this.addJobSpec(job.build());
    this.sortQueue();

    return result;
  }

  async addJobs(jobs: JobBuilder[]): Promise<BuiltJob[]> {
    const results = await Promise.all(
      jobs.map((job) => this.addJobSpec(job.build())),
    );
    this.sortQueue();

    return results;
  }

  async addJobSpec(spec: JobSpec): Promise<BuiltJob> {
    const job = InMemoryJob.fromSpec(spec, {
      dateProvider: this.dateProvider,
    });

    this.queue.push(job.getState());

    return {
      id: job.getId(),
    };
  }

  async readJob<T extends BaseJobData>(
    id: string,
  ): Promise<NonAcquiredJob<T> | null> {
    const entry = this.queue.find((job) => job.id === id);
    if (!entry) {
      return null;
    }

    return new InMemoryJob({
      state: entry as InMemoryJobState<T>,
      dateProvider: this.dateProvider,
    });
  }

  setProcessor(processor: Processor): void {
    this.processor = processor;
  }

  startProcessing(): void {
    this.jobsLooper.start();
  }

  stopProcessing(): void {
    this.jobsLooper.stop();
  }

  setLooper(looper: Looper) {
    this.jobsLooper = looper;
    this.jobsLooper.configure(() => this.processJobs());
  }

  private async processJobs() {
    if (!this.processor) {
      throw new Error('Processor is not set');
    }

    // Prevent the processor from being erased by the time it is called
    const processor = this.processor;

    // Get all jobs that are waiting to be processed
    const jobsToProcess = this.queue
      .filter((job) => job.status === 'waiting')
      .filter(
        (job) =>
          job.scheduledAt.getTime() <= this.dateProvider.getDate().getTime(),
      );

    // Process jobs
    for (const state of jobsToProcess) {
      const acquiredJob = new InMemoryJob({
        state,
        dateProvider: this.dateProvider,
      });

      acquiredJob.acquire();

      // We need to schedule all the jobs before starting to run any of them.
      // We use setImmediate so that jobs run one after the other after all the
      // waiting jobs have been scheduled.

      setImmediate(async () => {
        try {
          await processor.process(acquiredJob);
          await acquiredJob.complete();
        } catch (e) {
          await acquiredJob.fail(e);
        }
      });
    }
  }

  private sortQueue() {
    this.queue.sort((a, b) => {
      // Sort first from the highest priority to the least
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }

      // Sort from the oldest to the newest
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }
}
