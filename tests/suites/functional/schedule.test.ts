import { getTestedDrivers } from '../../config/tested-drivers.js';
import { SpyProcessor } from '../../adapters/spy-processor.js';
import { Duration } from '../../../src/utils/duration.js';
import { Delay } from '../../../src/core/schedule/delay.js';

describe.each(getTestedDrivers())('%s', (tester) => {
  beforeAll(() => tester.beforeAll());
  beforeEach(() => tester.beforeEach());
  afterAll(() => tester.afterAll());
  afterEach(() => tester.afterEach());

  describe('asap', () => {
    test('job runs as soon as possible by default', async () => {
      const MAX_DELAY = 5;

      const queue = tester.getKujob().createQueue({ name: 'myqueue' });
      const job = queue.createJob({});

      const { id } = await job.save();

      const processor = new SpyProcessor<{ position: number }>();
      queue.setProcessor(processor);
      queue.startProcessing();

      await expect.poll(() => processor.getJobsData()).toHaveLength(1);

      const savedJob = (await queue.readJob(id))!;

      const distance =
        savedJob.finishedAt()!.getTime() - savedJob.createdAt()!.getTime();
      expect(distance).toBeLessThanOrEqual(MAX_DELAY);
    });
  });

  describe('delay', () => {
    test('job is not run before a delay', async () => {
      const DELAY_IN_MS = 30;

      const queue = tester.getKujob().createQueue({ name: 'myqueue' });
      const job = queue.createJob({}).schedule(
        new Delay({
          duration: Duration.milliseconds(DELAY_IN_MS),
        }),
      );

      const { id } = await job.save();

      const processor = new SpyProcessor<{ position: number }>();
      queue.setProcessor(processor);
      queue.startProcessing();

      await expect.poll(() => processor.getJobsData()).toHaveLength(1);

      const savedJob = (await queue.readJob(id))!;

      const distance =
        savedJob.finishedAt()!.getTime() - savedJob.createdAt()!.getTime();
      expect(distance).toBeGreaterThanOrEqual(DELAY_IN_MS);
    });

    test('repeat after delay', async () => {
      const DELAY_IN_MS = 15;

      const queue = tester.getKujob().createQueue({ name: 'myqueue' });
      const job = queue.createJob({}).schedule(
        new Delay({
          duration: Duration.milliseconds(DELAY_IN_MS),
          repeat: true,
        }),
      );

      await job.save();

      const processor = new SpyProcessor<{ position: number }>();
      queue.setProcessor(processor);
      queue.startProcessing();

      await expect
        .poll(() => processor.getJobsData().length)
        .toBeGreaterThanOrEqual(2);
    });
  });
});
