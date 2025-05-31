import { SpyProcessor, waitFor } from '@racyn/kujob-testutils';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from 'vitest';
import { getTestedDriver } from './config/tested-drivers.js';

describe('ordering', () => {
  const tester = getTestedDriver();

  beforeAll(() => tester.beforeAll());
  beforeEach(() => tester.beforeEach());
  afterAll(() => tester.afterAll());
  afterEach(() => tester.afterEach());

  test('jobs run from oldest to newest', async () => {
    const queue = await tester.getKujob().createQueue({ name: 'myqueue' });

    await queue.addJob(queue.createJob({ position: 1 }));
    await waitFor(1);
    await queue.addJob(queue.createJob({ position: 2 }));
    await waitFor(1);
    await queue.addJob(queue.createJob({ position: 3 }));
    await waitFor(1);

    const processor = new SpyProcessor<{ position: number }>();
    queue.setProcessor(processor);

    await tester.runOneBatch(queue);

    expect(processor.getJobsData()).toHaveLength(3);
    expect(processor.getJobsData()).toEqual([
      { position: 1 },
      { position: 2 },
      { position: 3 },
    ]);
  });

  test('jobs run in priority order', async () => {
    const queue = await tester.getKujob().createQueue({ name: 'myqueue' });
    await queue.addJobs([
      queue.createJob({ position: 1 }).priority(1),
      queue.createJob({ position: 2 }).priority(2),
      queue.createJob({ position: 3 }).priority(3),
    ]);

    const processor = new SpyProcessor<{ position: number }>();
    queue.setProcessor(processor);

    await tester.runOneBatch(queue);

    expect(processor.getJobsData()).toHaveLength(3);
    expect(processor.getJobsData()).toEqual([
      { position: 3 },
      { position: 2 },
      { position: 1 },
    ]);
  });

  test('jobs of the same priority run from oldest to newest', async () => {
    const queue = await tester.getKujob().createQueue({ name: 'myqueue' });
    await queue.addJobs([
      queue.createJob({ position: 1 }).priority(1),
      queue.createJob({ position: 2 }).priority(3),
      queue.createJob({ position: 3 }).priority(3),
    ]);

    const processor = new SpyProcessor<{ position: number }>();
    queue.setProcessor(processor);

    await tester.runOneBatch(queue);

    expect(processor.getJobsData()).toHaveLength(3);
    expect(processor.getJobsData()).toEqual([
      { position: 2 },
      { position: 3 },
      { position: 1 },
    ]);
  });
});
