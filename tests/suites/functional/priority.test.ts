import { DummyWorker } from '../../adapters/dummy-worker.js';
import { Tester } from '../../config/tester.js';

let tester = new Tester();

beforeAll(() => tester.beforeAll());
beforeEach(() => tester.beforeEach());
afterAll(() => tester.afterAll());

test('process the job with higher priority first', async () => {
  const queue = await tester.getKujob().createQueue('my-queue');
  const worker = new DummyWorker();
  queue.register(worker);

  const lowPri = await queue.addJob({
    type: 'job',
    priority: 1,
  });
  const highPri = await queue.addJob({
    type: 'job',
    priority: 2,
  });

  await worker.processNextJob();

  const highPriJob = (await queue.readJob(highPri))!;
  expect(highPriJob.status).toBe('completed');

  const lowPriJob = (await queue.readJob(lowPri))!;
  expect(lowPriJob.status).toBe('pending');
});

test('when the priority is the same, process the earlier one', async () => {
  const queue = await tester.getKujob().createQueue('my-queue');
  const worker = new DummyWorker();
  queue.register(worker);

  const first = await queue.addJob({
    type: 'job',
    priority: 2,
  });
  const second = await queue.addJob({
    type: 'job',
    priority: 2,
  });

  await worker.processNextJob();

  const completedJob = (await queue.readJob(first))!;
  expect(completedJob.status).toBe('completed');

  const pendingJob = (await queue.readJob(second))!;
  expect(pendingJob.status).toBe('pending');
});
