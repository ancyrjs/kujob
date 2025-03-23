import { getTestedDrivers } from '../../config/tested-drivers.js';
import { SpyProcessor } from '../../adapters/spy-processor.js';

describe.each(getTestedDrivers())('%s', (tester) => {
  beforeAll(() => tester.beforeAll());
  beforeEach(() => tester.beforeEach());
  afterAll(() => tester.afterAll());
  afterEach(() => tester.afterEach());

  test('jobs are un in priority order', async () => {
    const queue = tester.getKujob().createQueue({ name: 'myqueue' });
    await queue.addJobs([
      queue.createJob({ priority: 1 }).priority(1),
      queue.createJob({ priority: 2 }).priority(2),
      queue.createJob({ priority: 3 }).priority(3),
    ]);

    const processor = new SpyProcessor<{ priority: number }>();
    queue.setProcessor(processor);

    await tester.processJobs(queue);

    expect(processor.getJobs()).toHaveLength(3);
    expect(processor.getJobs()).toEqual([
      { priority: 3 },
      { priority: 2 },
      { priority: 1 },
    ]);
  });
});
