import { Worker } from '../../src/worker.js';
import { WorkingJob } from '../../src/job.js';

export class FailingWorker implements Worker {
  async process(job: WorkingJob): Promise<any> {
    throw new Error('Job Failed');
  }
}
