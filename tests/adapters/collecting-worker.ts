import { BaseWorker } from '../../src/worker.js';
import { Job } from '../../src/job.js';

export class CollectingWorker extends BaseWorker {
  private ids: string[] = [];

  async process(job: Job): Promise<any> {
    this.ids.push(job.getId());
  }

  getCount() {
    return this.ids.length;
  }

  intersection(other: CollectingWorker) {
    return this.ids.filter((id) => other.ids.includes(id));
  }
}
