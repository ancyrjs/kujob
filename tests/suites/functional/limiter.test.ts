import { Tester } from '../../config/tester.js';
import { CountingWorker } from '../../adapters/counting-worker.js';
import { generateUuid } from '../../../src/generate-uuid.js';
import { waitFor } from '../../config/wait-for.js';
import { OncePoller } from '../../../src/poller/once-poller.js';
import { WindowLimiter } from '../../../src/queue/window-limiter.js';

let tester = new Tester();

beforeAll(() => tester.beforeAll());
beforeEach(() => tester.beforeEach());
afterAll(() => tester.afterAll());

test('only one job should be processed by the worker', async () => {
  const kujob = tester.getKujob();

  const queue = await kujob.createQueue('my-queue', {
    limiter: new WindowLimiter({ max: 1, every: 60 }),
  });

  const workerA = new CountingWorker();

  await queue.register(workerA);

  const jobOneId = generateUuid();
  const jobTwoId = generateUuid();

  await queue.addJob({ type: 'job', id: jobOneId });
  await queue.addJob({ type: 'job', id: jobTwoId });

  await workerA.processNextJob();
  await workerA.processNextJob();

  const jobTwo = (await queue.readJob(jobTwoId))!;
  expect(jobTwo.status).toBe('pending');
});

test('two workers should share the same rate limit', async () => {
  const kujob = tester.getKujob();

  const queue = await kujob.createQueue('my-queue', {
    limiter: new WindowLimiter({ max: 1, every: 60 }),
  });

  const workerA = new CountingWorker();
  const workerB = new CountingWorker();

  await queue.register(workerA);
  await queue.register(workerB);

  const jobOneId = generateUuid();
  const jobTwoId = generateUuid();

  await queue.addJob({ type: 'job', id: jobOneId });
  await queue.addJob({ type: 'job', id: jobTwoId });

  await workerA.processNextJob();
  await workerB.processNextJob();

  const jobTwo = (await queue.readJob(jobTwoId))!;
  expect(jobTwo.status).toBe('pending');

  expect(workerA.getCount()).toBe(1);
  expect(workerB.getCount()).toBe(0);
});

test('spreading evenly', async () => {
  const kujob = tester.getKujob();

  const queue = await kujob.createQueue('my-queue', {
    limiter: new WindowLimiter({ max: 4, every: 60 }),
    poller: new OncePoller({ batch: 100 }),
  });

  const workerA = new CountingWorker();
  const workerB = new CountingWorker();

  await queue.register(workerA);
  await queue.register(workerB);

  const jobIds = [
    generateUuid(),
    generateUuid(),
    generateUuid(),
    generateUuid(),
  ];

  await queue.addJobs(jobIds.map((id) => ({ type: 'job', id })));

  await workerA.startPolling();
  await workerB.startPolling();

  await waitFor(1);

  expect(workerA.getCount()).toBe(2);
  expect(workerB.getCount()).toBe(2);
});
