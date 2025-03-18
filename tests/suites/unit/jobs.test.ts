import { mock } from 'vitest-mock-extended';
import { StackLogger } from '../../adapters/stack-logger.js';
import { Worker } from '../../../src/worker.js';
import { DummyWorker } from '../../adapters/dummy-worker.js';
import { Tester } from '../../config/tester.js';

let tester = new Tester();

beforeAll(() => tester.beforeAll());
beforeEach(() => tester.beforeEach());
afterAll(() => tester.afterAll());

describe('the handler completes', () => {
  test('completes the job', async () => {
    const { queue, jobId } = await createQueueWithJob();

    queue.register('my-job', new DummyWorker());
    await queue.processNextJob();

    const job = (await queue.readJob(jobId))!;
    expect(job.status).toBe('completed');
  });

  test('calls the handler', async () => {
    const { queue } = await createQueueWithJob();

    const worker = mock<Worker>();
    queue.register('my-job', worker);
    await queue.processNextJob();

    expect(worker.process).toHaveBeenCalledOnce();
  });
});

describe('the handler fails', () => {
  test('marks the job as failed', async () => {
    const { queue, jobId } = await createQueueWithJob();

    const worker = mock<Worker>();
    worker.process.mockRejectedValueOnce(new Error('Failed'));

    queue.register('my-job', worker);
    await queue.processNextJob();

    const job = (await queue.readJob(jobId))!;
    expect(job.status).toBe('failed');
  });
});

describe('no handler registered', () => {
  test('keeps the job as processing', async () => {
    const { queue, jobId } = await createQueueWithJob();

    await queue.processNextJob();

    const job = (await queue.readJob(jobId))!;
    expect(job.status).toBe('dead');
    expect(job.workerId).toBe(null);
  });

  test('warns about unregistered job', async () => {
    const { logger } = await createQueueWithJob();

    expect(logger.warnings).toContain(
      'No handler registered for job type: my-job',
    );
  });
});

describe('a job without handler followed by a job with handler', () => {
  test('process the job with handler', async () => {
    const kujob = tester.getKujob();

    const queue = await kujob.createQueue('my-queue');
    queue.register('with-handler-job', new DummyWorker());

    const noHandlerJobId = await queue.addJob({
      type: 'no-handler-job',
    });
    const jobId = await queue.addJob({
      type: 'with-handler-job',
    });

    await queue.processNextJob();
    await queue.processNextJob();

    const noHandlerJob = (await queue.readJob(noHandlerJobId))!;
    expect(noHandlerJob.status).toBe('dead');

    const job = (await queue.readJob(jobId))!;
    expect(job.status).toBe('completed');
  });
});

const createQueueWithJob = async (config?: { logger?: StackLogger }) => {
  const kujob = tester.getKujob();

  const logger = config?.logger ?? new StackLogger();
  kujob.setLogger(logger);

  const queue = await kujob.createQueue('my-queue');
  const jobId = await queue.addJob({
    type: 'my-job',
  });

  return {
    logger,
    queue,
    jobId,
  };
};
