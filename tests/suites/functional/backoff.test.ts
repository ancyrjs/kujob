import { getTestedDrivers } from '../../config/tested-drivers.js';
import { FailingProcessor } from '../../adapters/failing-processor.js';
import { expectDate } from '../../utils/date-within.js';
import { Queue } from '../../../src/core/queue.js';
import { Tester } from '../../config/tester.js';
import { BackoffStrategy } from '../../../src/core/backoff/backoff-strategy.js';
import { FixedBackoff } from '../../../src/core/backoff/fixed-backoff.js';

describe.each(getTestedDrivers())('%s', (tester) => {
  beforeAll(() => tester.beforeAll());
  beforeEach(() => tester.beforeEach());
  afterAll(() => tester.afterAll());
  afterEach(() => tester.afterEach());

  test('default to immediate re-schedule', async () => {
    const driver = new TestDriver(tester);
    await driver.setup({ backoff: null });
    await driver.runOneBatch();
    await driver.expectJobToBeRescheduledWithin(3);
  });

  test('fixed backoff', async () => {
    const driver = new TestDriver(tester);
    await driver.setup({ backoff: new FixedBackoff({ ms: 100 }) });
    await driver.runOneBatch();
    await driver.expectJobToBeRescheduledAround(100, 5);
  });
});

class TestDriver {
  private jobId: string | null = null;
  private processor: FailingProcessor = new FailingProcessor();
  private queue: Queue | null = null;

  constructor(private readonly tester: Tester) {}

  async setup({ backoff }: { backoff: BackoffStrategy | null }) {
    this.queue = this.tester.getKujob().createQueue({ name: 'myqueue' });
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
