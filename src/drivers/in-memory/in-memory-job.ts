import { BaseJobData, Job, JobSpec } from '../../core/job.js';
import { InMemoryJobState } from './in-memory-job-state.js';
import { DateProvider } from '../../core/date/date-provider.js';
import { randomUuid } from '../../utils/random-uuid.js';

export class InMemoryJob<T extends BaseJobData> implements Job<T> {
  private state: InMemoryJobState<T>;
  private dateProvider: DateProvider;

  static fromSpec(
    spec: JobSpec,
    props: {
      dateProvider: DateProvider;
    },
  ) {
    const now = props.dateProvider.getDate();

    return new InMemoryJob({
      state: {
        ...spec,
        id: spec.id ?? randomUuid(),
        status: 'waiting',
        createdAt: now,
        scheduledAt: spec.schedule.firstRunAt({ now }),
        startedAt: null,
        updatedAt: null,
        finishedAt: null,
        failureReason: null,
      },
      dateProvider: props.dateProvider,
    });
  }

  constructor(props: {
    state: InMemoryJobState<T>;
    dateProvider: DateProvider;
  }) {
    this.state = props.state;
    this.dateProvider = props.dateProvider;
  }

  getData(): T {
    return this.state.data;
  }

  getId(): string {
    return this.state.id;
  }

  isWaiting(): boolean {
    return this.state.status === 'waiting';
  }

  isProcessing(): boolean {
    return this.state.status === 'processing';
  }

  isCompleted(): boolean {
    return this.state.status === 'completed';
  }

  isFailed(): boolean {
    return this.state.status === 'failed';
  }

  createdAt(): Date {
    return this.state.createdAt;
  }

  scheduledAt(): Date {
    return this.state.scheduledAt;
  }

  startedAt(): Date | null {
    return this.state.startedAt;
  }

  finishedAt(): Date | null {
    return this.state.finishedAt;
  }

  updatedAt(): Date | null {
    return this.state.updatedAt;
  }

  getFailureReason(): string | null {
    return this.state.failureReason;
  }

  getState() {
    return this.state;
  }

  acquire() {
    this.state.status = 'processing';
    this.state.startedAt = this.dateProvider.getDate();
  }

  async complete(): Promise<void> {
    const nextRunAt = this.state.schedule.nextRunAt({
      now: this.dateProvider.getDate(),
    });

    if (nextRunAt) {
      this.state.schedule.scheduledForNextRun();

      this.state.status = 'waiting';
      this.state.scheduledAt = nextRunAt;
    } else {
      this.state.status = 'completed';
      this.state.finishedAt = this.dateProvider.getDate();
    }
  }

  async fail(reason: any): Promise<void> {
    if (this.state.attempts > 1) {
      this.reschedule();
      return;
    }

    this.definitelyFail(reason);
  }

  private reschedule(): void {
    this.state.attempts--;
    this.state.status = 'waiting';
    return;
  }

  private definitelyFail(reason: any) {
    this.state.status = 'failed';
    this.state.finishedAt = this.dateProvider.getDate();
    this.state.failureReason =
      reason instanceof Error ? reason.message : 'unknown';
  }
}
