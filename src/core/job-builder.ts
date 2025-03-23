import { BaseJobData, BuiltJob, RawJob } from './job.js';
import { Queue } from './queue.js';

export class JobBuilder<T extends BaseJobData = BaseJobData> {
  private state: RawJob<T>;
  private queue: Queue;

  constructor(props: { data: T; queue: Queue }) {
    this.state = {
      id: null,
      data: props.data,
      attempts: 1,
      delay: 0,
      notBefore: null,
      priority: 0,
    };

    this.queue = props.queue;
  }

  attempts(value: number): this {
    this.state.attempts = value;
    return this;
  }

  delay(value: number): this {
    this.state.delay = value;
    return this;
  }

  id(value: string): this {
    this.state.id = value;
    return this;
  }

  notBefore(date: Date): this {
    this.state.notBefore = date;
    return this;
  }

  priority(value: number): this {
    this.state.priority = value;
    return this;
  }

  save(): Promise<BuiltJob> {
    return this.queue.addRawJob(this.state);
  }

  raw() {
    return this.state;
  }
}
