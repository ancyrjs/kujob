import { DummyWorker } from '../../adapters/dummy-worker.js';
import { generateUuid } from '../../../src/generate-uuid.js';
import { Tester } from '../../config/tester.js';
import { CountingWorker } from '../../adapters/counting-worker.js';

let tester = new Tester();

beforeAll(() => tester.beforeAll());
beforeEach(() => tester.beforeEach());
afterAll(() => tester.afterAll());

test('adding many jobs to the queue', async () => {
  const kujob = tester.getKujob();

  const queue = await kujob.createQueue('my-queue');
  queue.register(new DummyWorker());

  const jobIds = [generateUuid(), generateUuid(), generateUuid()];

  await queue.addJobs(jobIds.map((id) => ({ type: 'queue', id })));

  let addedJobsCount = 0;

  for (const jobId of jobIds) {
    const job = await queue.readJob(jobId);
    if (job) {
      addedJobsCount++;
    }
  }

  expect(addedJobsCount).toBe(jobIds.length);
});

test(
  'adding heck a lot of jobs to the queue',
  {
    // Long test in my machine, can take even more time on CI
    timeout: 20_000,
  },
  async () => {
    // This test is needed on a large amount of jobs
    // because the mechanism used to batch add the jobs seems sensitive
    // to the number of jobs * the number of parameters inserted.
    // of course the number of parameters is an internal detail of the implementation
    // and it will definitely change in the future, so this test ensure that we can
    // add more parameters without breaking the system.

    const kujob = tester.getKujob();

    const queue = await kujob.createQueue('my-queue');
    const worker = new CountingWorker();
    queue.register(worker);

    const jobCount = 10_000;
    const jobIds = Array.from({ length: jobCount }, () => generateUuid());

    await queue.addJobs(jobIds.map((id) => ({ type: 'queue', id })));
    worker.startPolling();

    let completedJobsCount = 0;
    do {
      await worker.startPolling();
      completedJobsCount = await queue.fetchCompletedJobsCount();
    } while (completedJobsCount !== jobIds.length);

    await worker.stopPolling();

    expect(worker.getCount()).toBe(jobIds.length);
  },
);
