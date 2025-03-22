import { PollApi, Poller } from './poller.js';

export class OncePoller implements Poller {
  /**
   * Number of jobs to fetch in a single batch
   * @private
   */
  private batch: number;

  constructor({ batch = 25 }: { batch?: number }) {
    this.batch = batch;
  }

  async start(api: PollApi): Promise<void> {
    const jobs = await api.acquireNextJobs({ count: this.batch });

    jobs.forEach((job) => {
      process.nextTick(async () => {
        try {
          await api.processJob(job);
        } catch (e) {}
      });
    });
  }

  async stop(): Promise<void> {}

  clone(): Poller {
    return new OncePoller({ batch: this.batch });
  }
}
