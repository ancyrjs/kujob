import { getTestedDrivers } from '../../config/tested-drivers.js';
import { SpyProcessor } from '../../adapters/spy-processor.js';
import { Duration } from '../../../src/utils/duration.js';
import { DelaySchedule } from '../../../src/core/schedule/delay-schedule.js';
import { ScheduleStrategy } from '../../../src/core/schedule/schedule-strategy.js';
import { Queue } from '../../../src/core/queue.js';
import { Tester } from '../../config/tester.js';

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
      await driver.expectJobToHaveRunWithin(15);
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
    this.queue = this.tester.getKujob().createQueue({ name: 'myqueue' });
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
    return expect.poll(() => this.processor.getJobsData()).toHaveLength(1);
  }

  async waitUntilJobIsProcessedAtLeast(times: number) {
    this.queue!.startProcessing();
    return expect
      .poll(() => this.processor.getJobsData().length)
      .toBeGreaterThanOrEqual(times);
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
