import { CreateQueueParams, Driver } from './driver.js';
import { Queue } from './queue.js';

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
