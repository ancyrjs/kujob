import { Worker } from '../../src/worker.js';
import { Job } from '../../src/job.js';

export class DummyWorker implements Worker {
  async process(job: Job): Promise<any> {}
}
