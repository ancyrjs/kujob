import { CreateQueueParams, Driver } from './core/driver.js';
import { Queue } from './core/queue.js';

export class Kujob {
  private driver: Driver;

  constructor(props: { driver: Driver }) {
    this.driver = props.driver;
  }

  getDriver<T extends Driver>() {
    return this.driver as T;
  }

  createQueue(params: CreateQueueParams): Queue {
    return this.driver.createQueue(params);
  }
}
