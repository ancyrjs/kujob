import { BackoffStrategy, Duration, FixedBackoff, Queue } from '@kujob/core';
import { expectDate, FailingProcessor } from '@kujob/testutils';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from 'vitest';
import { getTestedDriver } from './config/tested-drivers.js';
import { TestDriver } from './config/test-driver.js';

describe('backoff', () => {
  const tester = getTestedDriver();

  beforeAll(() => tester.beforeAll());
  beforeEach(() => tester.beforeEach());
  afterAll(() => tester.afterAll());
  afterEach(() => tester.afterEach());

  test('default to immediate re-schedule', async () => {
    const driver = new TestFixture(tester);
    await driver.setup({ backoff: null });
    await driver.runOneBatch();
    await driver.expectJobToBeRescheduledWithin(3);
  });

  test('fixed backoff', async () => {
    const driver = new TestFixture(tester);
    await driver.setup({
      backoff: new FixedBackoff({ duration: Duration.milliseconds(250) }),
    });
    await driver.runOneBatch();
    await driver.expectJobToBeRescheduledAround(250, 50);
  });
});

class TestFixture {
  private jobId: string | null = null;
  private processor: FailingProcessor = new FailingProcessor();
  private queue: Queue | null = null;

  constructor(private readonly tester: TestDriver) {}

  async setup({ backoff }: { backoff: BackoffStrategy | null }) {
    this.queue = await this.tester.getKujob().createQueue({ name: 'myqueue' });
    const job = this.queue.createJob({}).attempts(2);

    if (backoff) {
      job.backoff(backoff);
    }

    const { id } = await job.save();
    this.jobId = id;
  }

  async runOneBatch() {
    this.queue!.setProcessor(this.processor);
    await this.tester.runOneBatch(this.queue!);
  }

  async expectJobToBeRescheduledWithin(milliseconds: number) {
    const savedJob = (await this.queue!.readJob(this.jobId!))!;

    expect(savedJob.isWaiting()).toBe(true);
    expectDate(savedJob.scheduledAt()!).willHappenWithin(milliseconds);
  }

  async expectJobToBeRescheduledAround(milliseconds: number, delta: number) {
    const savedJob = (await this.queue!.readJob(this.jobId!))!;

    expect(savedJob.isWaiting()).toBe(true);
    expectDate(savedJob.scheduledAt()!).willHappenAround(milliseconds, delta);
  }
}
