import { FailingProcessor } from '@kujob/testutils';
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

describe('attempts', () => {
  const tester = getTestedDriver();

  beforeAll(() => tester.beforeAll());
  beforeEach(() => tester.beforeEach());
  afterAll(() => tester.afterAll());
  afterEach(() => tester.afterEach());

  test('jobs are attempted once by default', async () => {
    const queue = await tester.getKujob().createQueue({ name: 'myqueue' });
    const { id: jobId } = await queue.addJob(queue.createJob({}));

    const processor = new FailingProcessor<{ position: number }>();
    queue.setProcessor(processor);

    await tester.runOneBatch(queue);

    const job = await queue.readJob(jobId);
    expect(job!.isFailed()).toBe(true);
  });

  test('jobs with more than 1 attempts are rescheduled', async () => {
    const queue = await tester.getKujob().createQueue({ name: 'myqueue' });
    const { id: jobId } = await queue.addJob(queue.createJob({}).attempts(2));

    const processor = new FailingProcessor<{ position: number }>();
    queue.setProcessor(processor);

    await tester.runOneBatch(queue);

    const job = (await queue.readJob(jobId))!;
    expect(job.isFailed()).toBe(false);
    expect(job.isWaiting()).toBe(true);
  });

  test('jobs are processed no more than the number of attempts', async () => {
    const queue = await tester.getKujob().createQueue({ name: 'myqueue' });
    const { id: jobId } = await queue.addJob(queue.createJob({}).attempts(3));

    const processor = new FailingProcessor<{ position: number }>();
    queue.setProcessor(processor);
    queue.startProcessing();

    await expect
      .poll(async () => {
        const job = (await queue.readJob(jobId))!;
        return job.isFailed();
      })
      .toBe(true);

    queue.stopProcessing();

    expect(processor.getJobsData()).toHaveLength(3);
  });
});
