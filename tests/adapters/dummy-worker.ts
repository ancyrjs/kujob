import { Worker } from '../../src/worker.js';
import { WorkingJob } from '../../src/job.js';

export class DummyWorker implements Worker {
  async process(job: WorkingJob): Promise<any> {}
}
