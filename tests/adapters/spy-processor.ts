import { Processor } from '../../src/core/processor.js';
import { BaseJobData, Job } from '../../src/core/job.js';

export class SpyProcessor<T extends BaseJobData = any> implements Processor {
  private jobs: T[] = [];

  async process(job: Job<T>): Promise<void> {
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
