import { CreateQueueParams, Driver } from '../../core/driver.js';
import { Queue } from '../../core/queue.js';
import { InMemoryQueue } from './in-memory-queue.js';

export class InMemoryDriver implements Driver {
  createQueue(params: CreateQueueParams): Queue {
    return new InMemoryQueue(params);
  }
}
