import { BaseWorker } from '../../src/worker.js';
import { Job } from '../../src/job.js';

export class DummyWorker extends BaseWorker {
  async process(job: Job): Promise<any> {}
}
