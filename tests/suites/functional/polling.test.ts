import { DummyWorker } from '../../adapters/dummy-worker.js';
import { Tester } from '../../config/tester.js';
import { generateUuid } from '../../../src/generate-uuid.js';
import { waitFor } from '../../config/wait-for.js';

let tester = new Tester();

beforeAll(() => tester.beforeAll());
beforeEach(() => tester.beforeEach());
afterAll(() => tester.afterAll());

test('run to completion', async () => {
  const kujob = tester.getKujob();

  const queue = await kujob.createQueue('my-queue');
  const worker = new DummyWorker();
  queue.register(worker);

  const jobIds = [generateUuid(), generateUuid(), generateUuid()];
  await queue.addJobs(jobIds.map((id) => ({ type: 'job', id })));

  worker.startPolling();

  await waitFor(100);

  worker.stopPolling();

  const completedJobs: string[] = [];
  for (const id of jobIds) {
    const job = await queue.readJob(id);
    if (job && job.status === 'completed') {
      completedJobs.push(id);
    }
  }

  expect(completedJobs).toEqual(jobIds);
});
