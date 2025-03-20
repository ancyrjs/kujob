import { Worker } from '../../src/worker.js';
import { WorkingJob } from '../../src/job.js';

export class CountingWorker implements Worker {
  private count: number = 0;

  async process(job: WorkingJob): Promise<any> {
    this.count++;
  }

  getCount() {
    return this.count;
  }
}
