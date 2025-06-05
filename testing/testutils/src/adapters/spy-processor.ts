import { AcquiredJob, JobData, Processor } from '@kujob/core';

type JobInfo<T extends JobData> = {
  data: T;
  at: Date;
};
export class SpyProcessor<T extends JobData = any> implements Processor {
  private jobs: JobInfo<T>[] = [];

  async process(job: AcquiredJob<T>): Promise<void> {
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
