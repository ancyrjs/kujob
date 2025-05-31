import {
  BuiltJob,
  CreateQueueParams,
  DateProvider,
  Job,
  JobBuilder,
  JobData,
  JobState,
  Looper,
  NonAcquiredJob,
  Processor,
  Queue,
  randomUuid,
} from '@racyn/kujob-core';

export class InMemoryQueue implements Queue {
  private name: string;
  private queueId = randomUuid();
  private workerId = randomUuid();
  private queue: JobState[] = [];
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

  createJob<T extends JobData>(data: T): JobBuilder {
    return new JobBuilder({
      data,
      queue: this,
    });
  }

  async addJob(job: JobBuilder): Promise<BuiltJob> {
    const result = await this.addJobs([job]);
    return result[0];
  }

  async addJobs(jobs: JobBuilder[]): Promise<BuiltJob[]> {
    const results = jobs.map((builder) => {
      const job = Job.fromSpec({
        spec: builder.build(),
        queueId: this.queueId,
        dateProvider: this.dateProvider,
      });

      this.queue.push(job.getState());

      return {
        id: job.getId(),
      };
    });

    this.sortQueue();

    return results;
  }

  async readJob<T extends JobData>(
    id: string,
  ): Promise<NonAcquiredJob<T> | null> {
    const entry = this.queue.find((job) => job.id === id);
    if (!entry) {
      return null;
    }

    return new Job({
      state: entry as JobState<T>,
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

    // Prevent the processor from being erased by the time this function is called
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
      const job = new Job({
        state,
        dateProvider: this.dateProvider,
      });

      job.onAcquired({
        workerId: this.workerId,
      });

      // We need to schedule all the jobs before starting to run any of them.
      // We use setImmediate so that jobs run one after the other after all the
      // waiting jobs have been scheduled.

      setImmediate(async () => {
        try {
          await processor.process(job);
          await job.complete();
        } catch (e) {
          await job.fail(e);
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
