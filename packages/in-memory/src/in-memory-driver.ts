import {
  CreateQueueParams,
  CurrentDateProvider,
  DateProvider,
  Driver,
  Looper,
  Queue,
  TimeoutLooper,
} from '@ancyrjs/kujob-core';
import { InMemoryQueue } from './in-memory-queue.js';

export class InMemoryDriver implements Driver {
  private looper: Looper;
  private dateProvider: DateProvider;

  constructor(props?: { looper?: Looper; dateProvider?: DateProvider }) {
    this.looper = props?.looper ?? new TimeoutLooper();
    this.dateProvider = props?.dateProvider ?? CurrentDateProvider.INSTANCE;
  }

  createQueue(params: CreateQueueParams): Queue {
    return new InMemoryQueue({
      params,
      jobsLooper: this.looper.clone(),
      dateProvider: this.dateProvider,
    });
  }
}
