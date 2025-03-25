import { BaseJobData, BuiltJob, JobSpec } from './job.js';
import { Queue } from './queue.js';
import { ScheduleStrategy } from './schedule/schedule-strategy.js';
import { AsapSchedule } from './schedule/asap-schedule.js';
import { AsapBackoff } from './backoff/asap-backoff.js';
import { BackoffStrategy } from './backoff/backoff-strategy.js';

export class JobBuilder<T extends BaseJobData = BaseJobData> {
  private state: JobSpec<T>;
  private queue: Queue;

  constructor(props: { data: T; queue: Queue }) {
    this.state = {
      id: null,
      data: props.data,
      attempts: 1,
      schedule: AsapSchedule.INSTANCE,
      backoff: AsapBackoff.INSTANCE,
      priority: 0,
    };

    this.queue = props.queue;
  }

  attempts(value: number): this {
    this.state.attempts = value;
    return this;
  }

  schedule(schedule: ScheduleStrategy): this {
    this.state.schedule = schedule;
    return this;
  }

  backoff(backoff: BackoffStrategy): this {
    this.state.backoff = backoff;
    return this;
  }

  id(value: string): this {
    this.state.id = value;
    return this;
  }

  priority(value: number): this {
    this.state.priority = value;
    return this;
  }

  save(): Promise<BuiltJob> {
    return this.queue.addJobSpec(this.state);
  }

  build() {
    return this.state;
  }
}
