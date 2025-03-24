import { CreateQueueParams, Driver } from '../../core/driver.js';
import { Queue } from '../../core/queue.js';
import { DateProvider } from '../../core/date/date-provider.js';
import { InMemoryQueue } from './in-memory-queue.js';
import { Looper } from '../../core/looper/looper.js';
import { CurrentDateProvider } from '../../core/date/current-date-provider.js';
import { DefaultLooper } from '../../core/looper/default-looper.js';

export class InMemoryDriver implements Driver {
  private looper: Looper;
  private dateProvider: DateProvider;

  constructor(props?: { looper?: Looper; dateProvider?: DateProvider }) {
    this.looper = props?.looper ?? new DefaultLooper();
    this.dateProvider = props?.dateProvider ?? CurrentDateProvider.INSTANCE;
  }

  createQueue(params: CreateQueueParams): Queue {
    return new InMemoryQueue({
      params,
      looper: this.looper.clone(),
      dateProvider: this.dateProvider,
    });
  }
}
