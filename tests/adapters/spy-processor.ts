import { Processor } from '../../src/core/processor.js';
import { Job } from '../../src/core/job.js';

export class SpyProcessor implements Processor {
  private jobs: any[] = [];

  async process(job: Job<any>): Promise<void> {
    this.jobs.push(job.getData());
  }

  getConcurrency(): number {
    return 1;
  }

  getJobs() {
    return this.jobs;
  }

  getJobAt(index: number) {
    return this.jobs[index];
  }
}
