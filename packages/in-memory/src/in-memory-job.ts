import {
  BaseJobData,
  DateProvider,
  Job,
  JobSpec,
  randomUuid,
} from '@ancyrjs/kujob-core';
import { InMemoryJobState } from './in-memory-job-state.js';

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
        id: spec.id ?? randomUuid(),
        data: spec.data,
        priority: spec.priority,
        attemptsDone: 0,
        attemptsMax: spec.attempts,
        status: 'waiting',
        createdAt: now,
        schedule: spec.schedule,
        scheduledAt: spec.schedule.firstRunAt({ now }),
        backoff: spec.backoff,
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

  remainingAttempts(): number {
    return this.state.attemptsDone;
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
    this.state.attemptsDone++;

    if (this.state.attemptsDone < this.state.attemptsMax) {
      this.reschedule();
      return;
    }

    this.definitelyFail(reason);
  }

  private reschedule(): void {
    const nextRun = this.state.backoff.scheduleFor({
      now: this.dateProvider.getDate(),
      attemptsDone: this.state.attemptsDone,
      attemptsMax: this.state.attemptsMax,
    });

    this.state.status = 'waiting';
    this.state.scheduledAt = nextRun;
    return;
  }

  private definitelyFail(reason: any) {
    this.state.status = 'failed';
    this.state.finishedAt = this.dateProvider.getDate();
    this.state.failureReason =
      reason instanceof Error ? reason.message : 'unknown';
  }
}
