import { CreateQueueParams, Driver } from '../../core/driver.js';
import { Queue } from '../../core/queue.js';
import { InMemoryQueue } from './in-memory-queue.js';
import { DefaultLooper, Looper } from '../../utils/looper.js';

export class InMemoryDriver implements Driver {
  private looper: Looper;

  constructor(props?: { looper?: Looper }) {
    this.looper = props?.looper ?? new DefaultLooper();
  }

  createQueue(params: CreateQueueParams): Queue {
    return new InMemoryQueue({
      params,
      looper: this.looper.clone(),
    });
  }
}
