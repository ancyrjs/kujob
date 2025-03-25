import { BaseJobData, Job, Processor } from '@ancyrjs/kujob-core';

type JobInfo<T extends BaseJobData> = {
  data: T;
  at: Date;
};
export class SpyProcessor<T extends BaseJobData = any> implements Processor {
  private jobs: JobInfo<T>[] = [];

  async process(job: Job<T>): Promise<void> {
    this.jobs.push({
      data: job.getData(),
      at: new Date(),
    });
  }

  getConcurrency(): number {
    return 1;
  }

  getJobsData() {
    return this.jobs.map((job) => job.data);
  }

  getJobDataAt(index: number) {
    return this.jobs[index].data;
  }
}
