import { FailingProcessor, SpyProcessor } from '@kujob/testutils';
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

describe('processing', () => {
  const tester = getTestedDriver();

  beforeAll(() => tester.beforeAll());
  beforeEach(() => tester.beforeEach());
  afterAll(() => tester.afterAll());
  afterEach(() => tester.afterEach());

  const createJob = async () => {
    const queue = await tester.getKujob().createQueue({ name: 'myqueue' });
    const job = queue.createJob({ value: 1 });
    const { id } = await job.save();

    return {
      queue,
      data: { value: 1 },
      id,
    };
  };

  describe('lifecycle', () => {
    test('job starts in the waiting state', async () => {
      const { queue, id } = await createJob();

      const savedJob = (await queue.readJob(id))!;
      expect(savedJob.isWaiting()).toBe(true);
    });

    test('when the job starts being processed, it enters the processing state', async () => {
      const { queue, id } = await createJob();

      queue.setProcessor(new SpyProcessor());

      // Don't wait
      tester.runOneBatch(queue);

      const savedJob = (await queue.readJob(id))!;
      expect(savedJob.isProcessing()).toBe(true);
    });

    test('completing a job', async () => {
      const { queue, id } = await createJob();

      queue.setProcessor(new SpyProcessor());

      await tester.runOneBatch(queue);

      const savedJob = (await queue.readJob(id))!;
      expect(savedJob.isCompleted()).toBe(true);
    });

    test('failing a job', async () => {
      const { queue, id } = await createJob();

      queue.setProcessor(new FailingProcessor());

      await tester.runOneBatch(queue);

      const savedJob = (await queue.readJob(id))!;
      expect(savedJob.isFailed()).toBe(true);
      expect(savedJob.getFailureReason()).toBe(FailingProcessor.REASON);
    });
  });

  describe('mechanics', () => {
    test('invoking the processor with the jobs data', async () => {
      const { queue, data } = await createJob();

      const processor = new SpyProcessor();
      queue.setProcessor(processor);

      await tester.runOneBatch(queue);

      expect(processor.getJobsData()).toHaveLength(1);
      expect(processor.getJobDataAt(0)).toEqual(data);
    });
  });

  describe('long running', () => {
    test('adding jobs after the processor started', async () => {
      const queue = await tester.getKujob().createQueue({ name: 'myqueue' });

      const processor = new SpyProcessor();
      queue.setProcessor(processor);
      queue.startProcessing();

      await queue.addJob(queue.createJob({ value: 1 }));

      await expect.poll(() => processor.getJobsData()).toHaveLength(1);
      queue.stopProcessing();
    });
  });
});
