import { Worker } from '../../src/worker.js';
import { Job } from '../../src/job.js';

export class FailingWorker implements Worker {
  async process(job: Job): Promise<any> {
    throw new Error('Job Failed');
  }
}
