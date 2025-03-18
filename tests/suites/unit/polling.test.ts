import { DummyWorker } from '../../adapters/dummy-worker.js';
import { Tester } from '../../config/tester.js';
import { randomUUID } from 'node:crypto';

let tester = new Tester();

beforeAll(() => tester.beforeAll());
beforeEach(() => tester.beforeEach());
afterAll(() => tester.afterAll());

test('run to completion', async () => {
  const kujob = tester.getKujob();

  const queue = await kujob.createQueue('my-queue');
  queue.register('job', new DummyWorker());

  const jobIds = [randomUUID(), randomUUID(), randomUUID()];
  for (const id of jobIds) {
    await queue.addJob({ type: 'job', id });
  }

  queue.startPolling();

  const waitFor = (delay: number) =>
    new Promise((resolve) => setTimeout(resolve, delay));

  await waitFor(100);

  queue.stopPolling();

  const completedJobs: string[] = [];
  for (const id of jobIds) {
    const job = await queue.readJob(id);
    if (job && job.status === 'completed') {
      completedJobs.push(id);
    }
  }

  expect(completedJobs).toEqual(jobIds);
});
