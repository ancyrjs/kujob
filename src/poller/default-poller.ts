import { PollApi, Poller } from './poller.js';

export class DefaultPoller implements Poller {
  /**
   * Delay between polling
   * @private
   */
  private delay: number;

  /**
   * Number of jobs to fetch in a single batch
   * @private
   */
  private batch: number;

  private stopped: boolean = false;
  private handle: NodeJS.Timeout | null = null;

  constructor({ delay = 100, batch = 25 }: { delay?: number; batch?: number }) {
    this.delay = delay;
    this.batch = batch;
  }

  async start(api: PollApi): Promise<void> {
    this.stopped = false;
    return this.run(api);
  }

  async stop(): Promise<void> {
    this.stopped = true;

    if (this.handle) {
      clearTimeout(this.handle);
      this.handle = null;
    }
  }

  private async run(api: PollApi) {
    if (this.stopped) {
      return;
    }

    const jobs = await api.acquireNextJobs({ count: this.batch });
    let completed = 0;

    const onJobCompleted = () => {
      if (completed === jobs.length) {
        this.handle = setTimeout(() => {
          this.run(api);
        }, this.delay);
      }
    };

    jobs.forEach((job) => {
      process.nextTick(async () => {
        try {
          await api.processJob(job);
        } catch (e) {}

        completed++;
        onJobCompleted();
      });
    });
  }

  clone(): Poller {
    return new DefaultPoller({ delay: this.delay, batch: this.batch });
  }
}
