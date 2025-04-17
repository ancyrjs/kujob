import {
  DelaySchedule,
  Duration,
  Queue,
  ScheduleStrategy,
} from '@racyn/kujob-core';
import { SpyProcessor } from '@racyn/kujob-testutils';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from 'vitest';
import { getTestedDrivers } from './config/tested-drivers.js';

import { Tester } from './config/tester.js';

describe.each(getTestedDrivers())('%s', (tester) => {
  beforeAll(() => tester.beforeAll());
  beforeEach(() => tester.beforeEach());
  afterAll(() => tester.afterAll());
  afterEach(() => tester.afterEach());

  describe('asap', () => {
    test('job runs as soon as possible by default', async () => {
      const driver = new TestDriver(tester);
      await driver.setup({ schedule: null });
      await driver.waitUntilJobIsProcessed();
      await driver.expectJobToHaveRunWithin(150);
    });
  });

  describe('delay', () => {
    test('job is not run before a delay', async () => {
      const driver = new TestDriver(tester);
      await driver.setup({
        schedule: new DelaySchedule({
          duration: Duration.milliseconds(30),
        }),
      });
      await driver.waitUntilJobIsProcessed();
      await driver.expectJobToHaveRunAfter(30);
    });

    test('repeat after delay', async () => {
      const driver = new TestDriver(tester);
      await driver.setup({
        schedule: new DelaySchedule({
          duration: Duration.milliseconds(15),
          repeat: true,
        }),
      });
      await driver.waitUntilJobIsProcessedAtLeast(2);
    });
  });
});

class TestDriver {
  private jobId: string | null = null;
  private processor: SpyProcessor = new SpyProcessor();
  private queue: Queue | null = null;

  constructor(private readonly tester: Tester) {}

  async setup({ schedule }: { schedule: ScheduleStrategy | null }) {
    this.queue = await this.tester.getKujob().createQueue({ name: 'myqueue' });
    const job = this.queue.createJob({});

    if (schedule) {
      job.schedule(schedule);
    }

    const { id } = await job.save();
    this.jobId = id;

    this.queue.setProcessor(this.processor);
  }

  async waitUntilJobIsProcessed() {
    this.queue!.startProcessing();
    await expect.poll(() => this.processor.getJobsData()).toHaveLength(1);
    this.queue!.stopProcessing();
  }

  async waitUntilJobIsProcessedAtLeast(times: number) {
    this.queue!.startProcessing();
    await expect
      .poll(() => this.processor.getJobsData().length)
      .toBeGreaterThanOrEqual(times);
    this.queue!.stopProcessing();
  }

  async expectJobToHaveRunWithin(delay: number) {
    const timeToCompletion = await this.getTimeToCompletion();
    expect(timeToCompletion).toBeLessThanOrEqual(delay);
  }

  async expectJobToHaveRunAfter(delay: number) {
    const timeToCompletion = await this.getTimeToCompletion();
    expect(timeToCompletion).toBeGreaterThanOrEqual(delay);
  }

  private async getTimeToCompletion() {
    const savedJob = (await this.queue!.readJob(this.jobId!))!;

    return savedJob.finishedAt()!.getTime() - savedJob.createdAt()!.getTime();
  }
}
