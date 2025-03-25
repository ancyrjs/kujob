import { Queue } from '../../core/queue.js';
import {
  BaseJobData,
  BuiltJob,
  JobSpec,
  NonAcquiredJob,
} from '../../core/job.js';
import { Processor } from '../../core/processor.js';
import { CreateQueueParams } from '../../core/driver.js';
import { InMemoryJobState } from './in-memory-job-state.js';
import { Looper } from '../../core/looper/looper.js';
import { DateProvider } from '../../core/date/date-provider.js';
import { JobBuilder } from '../../core/job-builder.js';
import { InMemoryJob } from './in-memory-job.js';

export class InMemoryQueue implements Queue {
  private name: string;
  private queue: InMemoryJobState[] = [];
  private processor: Processor | null = null;
  private looper: Looper;
  private dateProvider: DateProvider;

  constructor(props: {
    params: CreateQueueParams;
    looper: Looper;
    dateProvider: DateProvider;
  }) {
    this.name = props.params.name;
    this.looper = props.looper;
    this.dateProvider = props.dateProvider;

    this.looper.configure(() => this.runProcessing());
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
    this.looper.start();
  }

  stopProcessing(): void {
    this.looper.stop();
  }

  setLooper(looper: Looper) {
    this.looper = looper;
    this.looper.configure(() => this.runProcessing());
  }

  private async runProcessing() {
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
