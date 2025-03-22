import { DummyWorker } from '../../adapters/dummy-worker.js';
import { Tester } from '../../config/tester.js';
import { generateUuid } from '../../../src/generate-uuid.js';
import { waitFor } from '../../config/wait-for.js';

let tester = new Tester();

beforeAll(() => tester.beforeAll());
beforeEach(() => tester.beforeEach());
afterAll(() => tester.afterAll());

test('the job should not execute if the delay has not passed yet', async () => {
  const queue = await tester.getKujob().createQueue('my-queue');
  const worker = new DummyWorker();
  queue.register(worker);

  const id = generateUuid();
  await queue.addJob({
    type: 'job',
    id,
    delay: 100,
  });

  await worker.processNextJob();

  const job = (await queue.readJob(id))!;
  expect(job.status).toBe('pending');
});

test('the job should execute after the delay', async () => {
  const queue = await tester.getKujob().createQueue('my-queue');
  const worker = new DummyWorker();
  queue.register(worker);

  const id = generateUuid();
  await queue.addJob({
    type: 'job',
    id,
    delay: 100,
  });

  // Of course delays are not a precise measure so this test might be a little bit flaky
  await waitFor(100);
  await worker.processNextJob();

  const job = (await queue.readJob(id))!;
  expect(job.status).toBe('completed');
});
