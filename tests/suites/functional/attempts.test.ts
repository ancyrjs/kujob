import { Tester } from '../../config/tester.js';
import { FailingWorker } from '../../adapters/failing-worker.js';
import { Job } from '../../../src/job.js';
import { BaseWorker } from '../../../src/worker.js';
import { generateUuid } from '../../../src/generate-uuid.js';

class FailOnIdWorker extends BaseWorker {
  constructor(private failOnId: string) {
    super();
  }

  async process(job: Job): Promise<any> {
    if (job.getId() === this.failOnId) {
      throw new Error('failed');
    }
  }
}

class FailOnceOnIdWorker extends BaseWorker {
  private didFailOnce = false;

  constructor(private failOnId: string) {
    super();
  }

  async process(job: Job): Promise<any> {
    if (job.getId() === this.failOnId) {
      if (this.didFailOnce === false) {
        this.didFailOnce = true;
        throw new Error('failed');
      }
    }
  }
}

let tester = new Tester();

beforeAll(() => tester.beforeAll());
beforeEach(() => tester.beforeEach());
afterAll(() => tester.afterAll());

describe('defaults', () => {
  test('default to one attempt only', async () => {
    const queue = await tester.getKujob().createQueue('my-queue');
    const worker = new FailingWorker();
    queue.register(worker);

    const jobId = await queue.addJob({
      type: 'job',
    });
    await worker.processNextJob();

    const job = (await queue.readJob(jobId))!;
    expect(job.status).toBe('failed');
  });
});

describe('more than one attempts', () => {
  test('puts the job back in queue', async () => {
    const queue = await tester.getKujob().createQueue('my-queue');
    const worker = new FailingWorker();
    queue.register(worker);

    const jobId = await queue.addJob({
      type: 'job',
      attempts: 2,
    });
    await worker.processNextJob();

    const job = (await queue.readJob(jobId))!;
    expect(job.status).toBe('pending');
  });

  test('put the job after all the other jobs of the same priority', async () => {
    const failedJobId = generateUuid();
    const nextUpJobId = generateUuid();

    const queue = await tester.getKujob().createQueue('my-queue');
    const worker = new FailOnIdWorker(failedJobId);
    queue.register(worker);

    await queue.addJob({
      id: failedJobId,
      type: 'job',
      priority: 1,
      attempts: 2,
    });

    await queue.addJob({
      id: nextUpJobId,
      type: 'job',
      priority: 1,
    });

    await worker.processNextJob();
    await worker.processNextJob();

    const job = (await queue.readJob(nextUpJobId))!;
    expect(job.status).toBe('completed');
  });

  test('complete the job once it gets re-processed and succeeds', async () => {
    const failingOnceJobId = generateUuid();
    const worker = new FailOnceOnIdWorker(failingOnceJobId);
    const queue = await tester.getKujob().createQueue('my-queue');
    queue.register(worker);

    await queue.addJob({
      id: failingOnceJobId,
      type: 'job',
      priority: 1,
      attempts: 2,
    });

    await queue.addJob({
      type: 'job',
      priority: 1,
    });

    await worker.processNextJob();
    await worker.processNextJob();
    await worker.processNextJob();

    const job = (await queue.readJob(failingOnceJobId))!;
    expect(job.status).toBe('completed');
  });

  test('fail the job if it fails more than allowed', async () => {
    const failingJobId = generateUuid();
    const worker = new FailOnIdWorker(failingJobId);
    const queue = await tester.getKujob().createQueue('my-queue');
    queue.register(worker);

    await queue.addJob({
      id: failingJobId,
      type: 'job',
      priority: 1,
      attempts: 2,
    });

    await queue.addJob({
      type: 'job',
      priority: 1,
    });

    await worker.processNextJob();
    await worker.processNextJob();
    await worker.processNextJob();

    const job = (await queue.readJob(failingJobId))!;
    expect(job.status).toBe('failed');
  });
});
