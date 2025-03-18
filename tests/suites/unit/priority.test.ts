import { DummyWorker } from '../../adapters/dummy-worker.js';
import { Tester } from '../../config/tester.js';

let tester = new Tester();

beforeAll(() => tester.beforeAll());
beforeEach(() => tester.beforeEach());
afterAll(() => tester.afterAll());

describe('priority', () => {
  test('process the job with higher priority first', async () => {
    const queue = await tester.getKujob().createQueue('my-queue');
    queue.register('job', new DummyWorker());

    const lowPri = await queue.addJob({
      type: 'job',
      priority: 1,
    });
    const highPri = await queue.addJob({
      type: 'job',
      priority: 2,
    });

    await queue.processNextJob();

    const highPriJob = (await queue.getJob(highPri))!;
    expect(highPriJob.status).toBe('completed');

    const lowPriJob = (await queue.getJob(lowPri))!;
    expect(lowPriJob.status).toBe('pending');
  });

  test('when the priority is the same, process the earlier one', async () => {
    const queue = await tester.getKujob().createQueue('my-queue');
    queue.register('job', new DummyWorker());

    const first = await queue.addJob({
      type: 'job',
      priority: 2,
    });
    const second = await queue.addJob({
      type: 'job',
      priority: 2,
    });

    await queue.processNextJob();

    const completedJob = (await queue.getJob(first))!;
    expect(completedJob.status).toBe('completed');

    const pendingJob = (await queue.getJob(second))!;
    expect(pendingJob.status).toBe('pending');
  });
});
