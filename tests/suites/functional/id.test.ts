import { DummyWorker } from '../../adapters/dummy-worker.js';
import { Tester } from '../../config/tester.js';
import { generateUuid } from '../../../src/generate-uuid.js';

let tester = new Tester();

beforeAll(() => tester.beforeAll());
beforeEach(() => tester.beforeEach());
afterAll(() => tester.afterAll());

test('pass a custom id to the job', async () => {
  const ID = generateUuid();

  const worker = new DummyWorker();
  const queue = await tester.getKujob().createQueue('my-queue');
  queue.register(worker);

  await queue.addJob({
    type: 'job',
    id: ID,
  });
  await worker.processNextJob();

  const job = await queue.readJob(ID);
  expect(job).not.toBeNull();
});

// TODO : what happens when a job with the ID already exists ?
// its one way to create a unique job in the whole system and eventually to make it repeatable
// so we should take into account this pattern
