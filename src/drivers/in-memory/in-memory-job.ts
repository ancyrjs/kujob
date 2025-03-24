import { BaseJobData, Job, JobSpec } from '../../core/job.js';
import { InMemoryJobState } from './in-memory-job-state.js';
import { randomUUID } from 'crypto';

const randomId = () => randomUUID();

export class InMemoryJob<T extends BaseJobData> implements Job<T> {
  private state: InMemoryJobState<T>;

  static fromSpec(spec: JobSpec) {
    const now = new Date();

    const state: InMemoryJobState = {
      ...spec,
      id: spec.id ?? randomId(),
      status: 'waiting',
      createdAt: now,
      scheduledAt: spec.delay.addToDate(now),
      startedAt: null,
      updatedAt: null,
      finishedAt: null,
      failureReason: null,
    };

    return new InMemoryJob({ state });
  }
  constructor(props: { state: InMemoryJobState<T> }) {
    this.state = props.state;
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

  async complete(): Promise<void> {
    this.state.status = 'completed';
    this.state.finishedAt = new Date();
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
    this.state.finishedAt = new Date();
    this.state.failureReason =
      reason instanceof Error ? reason.message : 'unknown';
  }
}
