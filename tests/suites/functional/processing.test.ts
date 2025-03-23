import { getTestedDrivers } from '../../config/tested-drivers.js';
import { SpyProcessor } from '../../adapters/spy-processor.js';
import { FailingProcessor } from '../../adapters/failing-processor.js';
import { waitFor } from '../../config/wait-for.js';

describe.each(getTestedDrivers())('%s', (tester) => {
  beforeAll(() => tester.beforeAll());
  beforeEach(() => tester.beforeEach());
  afterAll(() => tester.afterAll());
  afterEach(() => tester.afterEach());

  const createJob = async ({ id }: { id: string }) => {
    const queue = tester.getKujob().createQueue({ name: 'myqueue' });
    const job = queue.createJob({ value: 1 });
    await job.id(id).save();

    return {
      queue,
      data: { value: 1 },
    };
  };

  describe('lifecycle', () => {
    test('job starts in the waiting state', async () => {
      const { queue } = await createJob({ id: 'job' });

      const savedJob = (await queue.readJob('job'))!;
      expect(savedJob.isWaiting()).toBe(true);
    });

    test('when the job starts being processed, it enters the processing state', async () => {
      const { queue } = await createJob({ id: 'job' });

      queue.setProcessor(new SpyProcessor());

      // Don't wait
      tester.processJobs(queue);

      const savedJob = (await queue.readJob('job'))!;
      expect(savedJob.isProcessing()).toBe(true);
    });

    test('completing a job', async () => {
      const { queue } = await createJob({ id: 'job' });

      queue.setProcessor(new SpyProcessor());

      await tester.processJobs(queue);

      const savedJob = (await queue.readJob('job'))!;
      expect(savedJob.isCompleted()).toBe(true);
    });

    test('failing a job', async () => {
      const { queue } = await createJob({ id: 'job' });

      queue.setProcessor(new FailingProcessor());

      await tester.processJobs(queue);

      const savedJob = (await queue.readJob('job'))!;
      expect(savedJob.isFailed()).toBe(true);
      expect(savedJob.getFailureReason()).toBe(FailingProcessor.REASON);
    });
  });

  describe('mechanics', () => {
    test('invoking the processor with the jobs data', async () => {
      const { queue, data } = await createJob({ id: 'job' });

      const processor = new SpyProcessor();
      queue.setProcessor(processor);

      await tester.processJobs(queue);

      expect(processor.getJobs()).toHaveLength(1);
      expect(processor.getJobAt(0)).toEqual(data);
    });
  });

  describe('long running', () => {
    test('adding jobs after the processor started', async () => {
      const queue = tester.getKujob().createQueue({ name: 'myqueue' });

      const processor = new SpyProcessor();
      queue.setProcessor(processor);

      queue.startProcessing();

      await queue.addJob(queue.createJob({ value: 1 }));

      await waitFor(100);

      expect(processor.getJobs()).toHaveLength(1);
    });
  });
});
