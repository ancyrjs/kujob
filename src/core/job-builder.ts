import { BaseJobData, BuiltJob, JobSpec } from './job.js';
import { Queue } from './queue.js';
import { Duration } from '../utils/duration.js';

export class JobBuilder<T extends BaseJobData = BaseJobData> {
  private state: JobSpec<T>;
  private queue: Queue;

  constructor(props: { data: T; queue: Queue }) {
    this.state = {
      id: null,
      data: props.data,
      attempts: 1,
      delay: Duration.IMMEDIATE,
      priority: 0,
    };

    this.queue = props.queue;
  }

  attempts(value: number): this {
    this.state.attempts = value;
    return this;
  }

  delay(value: Duration): this {
    this.state.delay = value;
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
