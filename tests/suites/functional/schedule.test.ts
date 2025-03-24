import { getTestedDrivers } from '../../config/tested-drivers.js';
import { SpyProcessor } from '../../adapters/spy-processor.js';
import { Duration } from '../../../src/utils/duration.js';

describe.each(getTestedDrivers())('%s', (tester) => {
  beforeAll(() => tester.beforeAll());
  beforeEach(() => tester.beforeEach());
  afterAll(() => tester.afterAll());
  afterEach(() => tester.afterEach());

  test('job is not run before a delay', async () => {
    const DELAY_IN_MS = 30;

    const queue = tester.getKujob().createQueue({ name: 'myqueue' });
    const job = queue.createJob({}).delay(Duration.milliseconds(DELAY_IN_MS));

    const { id } = await job.save();

    const processor = new SpyProcessor<{ position: number }>();
    queue.setProcessor(processor);
    queue.startProcessing();

    await expect.poll(() => processor.getJobs()).toHaveLength(1);

    const savedJob = (await queue.readJob(id))!;

    const distance =
      savedJob.finishedAt()!.getTime() - savedJob.createdAt()!.getTime();
    expect(distance).toBeGreaterThanOrEqual(DELAY_IN_MS);
  });
});
