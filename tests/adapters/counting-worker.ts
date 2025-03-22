import { BaseWorker } from '../../src/worker.js';
import { Job } from '../../src/job.js';

export class CountingWorker extends BaseWorker {
  private count: number = 0;

  async process(job: Job): Promise<any> {
    this.count++;
  }

  getCount() {
    return this.count;
  }
}
