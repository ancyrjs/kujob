import { Tester } from '../../config/tester.js';
import { FailingWorker } from '../../adapters/failing-worker.js';
import { ReadOnlyJob } from '../../../src/job.js';

let tester = new Tester();

beforeAll(() => tester.beforeAll());
beforeEach(() => tester.beforeEach());
afterAll(() => tester.afterAll());

describe('defaults', () => {
  test('default to one attempt only', async () => {
    const queue = await tester.getKujob().createQueue('my-queue');
    queue.register('job', new FailingWorker());

    const jobId = await queue.addJob({
      type: 'job',
    });
    await queue.processNextJob();

    const job = (await queue.readJob(jobId))!;
    expect(job.status).toBe('failed');
  });
});

describe('more than one attempts', () => {
  test('puts the job back in queue', async () => {
    const queue = await tester.getKujob().createQueue('my-queue');
    queue.register('job', new FailingWorker());

    const jobId = await queue.addJob({
      type: 'job',
      attempts: 2,
    });
    await queue.processNextJob();

    const job = (await queue.readJob(jobId))!;
    expect(job.status).toBe('pending');
  });

  test('put the job after all the other jobs of the same priority', async () => {
    const queue = await tester.getKujob().createQueue('my-queue');
    queue.register('job', {
      async process(job: ReadOnlyJob<Record<string, any>>): Promise<any> {
        if (job.getId() === failedJobId) {
          throw new Error('failed');
        }
      },
    });

    const failedJobId = await queue.addJob({
      type: 'job',
      priority: 1,
      attempts: 2,
    });

    const nextUpJobId = await queue.addJob({
      type: 'job',
      priority: 1,
    });

    await queue.processNextJob();
    await queue.processNextJob();

    const job = (await queue.readJob(nextUpJobId))!;
    expect(job.status).toBe('completed');
  });

  test('complete the job once it gets re-processed and succeeds', async () => {
    let didFailOnce = false;

    const queue = await tester.getKujob().createQueue('my-queue');
    queue.register('job', {
      async process(job: ReadOnlyJob<Record<string, any>>): Promise<any> {
        if (job.getId() === failingOnceJobId) {
          if (didFailOnce === false) {
            didFailOnce = true;
            throw new Error('failed');
          }
        }
      },
    });

    const failingOnceJobId = await queue.addJob({
      type: 'job',
      priority: 1,
      attempts: 2,
    });

    await queue.addJob({
      type: 'job',
      priority: 1,
    });

    await queue.processNextJob();
    await queue.processNextJob();
    await queue.processNextJob();

    const job = (await queue.readJob(failingOnceJobId))!;
    expect(job.status).toBe('completed');
  });

  test('fail the job if it fails more than allowed', async () => {
    const queue = await tester.getKujob().createQueue('my-queue');
    queue.register('job', {
      async process(job: ReadOnlyJob<Record<string, any>>): Promise<any> {
        if (job.getId() === failingOnceJobId) {
          throw new Error('failed');
        }
      },
    });

    const failingOnceJobId = await queue.addJob({
      type: 'job',
      priority: 1,
      attempts: 2,
    });

    await queue.addJob({
      type: 'job',
      priority: 1,
    });

    await queue.processNextJob();
    await queue.processNextJob();
    await queue.processNextJob();

    const job = (await queue.readJob(failingOnceJobId))!;
    expect(job.status).toBe('failed');
  });
});
