import { StackLogger } from '../../adapters/stack-logger.js';
import { DummyWorker } from '../../adapters/dummy-worker.js';
import { Tester } from '../../config/tester.js';
import { CountingWorker } from '../../adapters/counting-worker.js';
import { FailingWorker } from '../../adapters/failing-worker.js';

let tester = new Tester();

beforeAll(() => tester.beforeAll());
beforeEach(() => tester.beforeEach());
afterAll(() => tester.afterAll());

describe('the handler completes', () => {
  test('completes the job', async () => {
    const { queue, jobId } = await createQueueWithJob();

    const worker = new DummyWorker();
    queue.register(worker);
    await worker.processNextJob();

    const job = (await queue.readJob(jobId))!;
    expect(job.status).toBe('completed');
  });

  test('calls the handler', async () => {
    const { queue } = await createQueueWithJob();

    const worker = new CountingWorker();
    queue.register(worker);
    await worker.processNextJob();

    expect(worker.getCount()).toBe(1);
  });
});

describe('the handler fails', () => {
  test('marks the job as failed', async () => {
    const { queue, jobId } = await createQueueWithJob();

    const worker = new FailingWorker();

    queue.register(worker);
    await worker.processNextJob();

    const job = (await queue.readJob(jobId))!;
    expect(job.status).toBe('failed');
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
