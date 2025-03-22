import { BaseWorker } from '../../src/worker.js';
import { Job } from '../../src/job.js';

export class FailingWorker extends BaseWorker {
  async process(job: Job): Promise<any> {
    throw new Error('Job Failed');
  }
}
