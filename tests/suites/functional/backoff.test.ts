import { getTestedDrivers } from '../../config/tested-drivers.js';
import { FailingProcessor } from '../../adapters/failing-processor.js';
import { expectDate } from '../../utils/date-within.js';
import { Queue } from '../../../src/core/queue.js';
import { Tester } from '../../config/tester.js';

describe.each(getTestedDrivers())('%s', (tester) => {
  beforeAll(() => tester.beforeAll());
  beforeEach(() => tester.beforeEach());
  afterAll(() => tester.afterAll());
  afterEach(() => tester.afterEach());

  test('job is re-scheduled immediately by default', async () => {
    const driver = new TestDriver(tester);
    await driver.setup({});
    await driver.runOneBatch();
    await driver.expectJobToBeRescheduledWithin(5);
  });
});

class TestDriver {
  private jobId: string | null = null;
  private processor: FailingProcessor = new FailingProcessor();
  private queue: Queue | null = null;

  constructor(private readonly tester: Tester) {}

  async setup({}: {}) {
    this.queue = this.tester.getKujob().createQueue({ name: 'myqueue' });
    const job = this.queue.createJob({}).attempts(2);

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
}
