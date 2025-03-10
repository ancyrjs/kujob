import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { Kujob } from '../src/index.js';

let container: StartedPostgreSqlContainer;
let kujob: Kujob;

beforeAll(async () => {
  container = await new PostgreSqlContainer().start();
  kujob = new Kujob({
    connection: {
      user: container.getUsername(),
      password: container.getPassword(),
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
    },
  });
  await kujob.start();
});

beforeEach(async () => {
  await kujob.purge();
});

afterAll(async () => {
  await kujob.end();
  await container.stop();
});

describe('the handler completes', () => {
  test('completes the job', async () => {
    const { queue, jobId } = await createQueueAndAddJob();

    queue.register('my-job', vi.fn());
    await queue.processNextJob();

    const job = (await queue.getJob(jobId))!;
    expect(job.status).toBe('completed');
  });

  test('calls the handler', async () => {
    const { queue } = await createQueueAndAddJob();

    const spy = vi.fn();
    queue.register('my-job', spy);
    await queue.processNextJob();

    expect(spy).toHaveBeenCalledOnce();
  });
});

describe('the handler fails', () => {
  test('marks the job as failed', async () => {
    const { queue, jobId } = await createQueueAndAddJob();

    queue.register(
      'my-job',
      vi.fn().mockRejectedValueOnce(new Error('Failed')),
    );
    await queue.processNextJob();

    const job = (await queue.getJob(jobId))!;
    expect(job.status).toBe('failed');
  });
});

describe('no handler registered', () => {
  test('keeps the job as processing', async () => {
    const { queue, jobId } = await createQueueAndAddJob();

    await queue.processNextJob();

    const job = (await queue.getJob(jobId))!;
    expect(job.status).toBe('processing');
    expect(job.workerId).toBe(null);
  });
});

describe.skip('a job without handler followed by a job with handler', () => {
  test('process the job with handler', async () => {
    const queue = await kujob.createQueue('my-queue');
    await queue.addJob({
      type: 'no-handler-job',
      payload: {},
    });
    const jobId = await queue.addJob({
      type: 'with-handler-job',
      payload: {},
    });

    await queue.processNextJob();

    const job = (await queue.getJob(jobId))!;
    expect(job.status).toBe('completed');
  });
});

const createQueueAndAddJob = async () => {
  const queue = await kujob.createQueue('my-queue');
  const jobId = await queue.addJob({
    type: 'my-job',
    payload: {
      foo: 'bar',
    },
  });

  return {
    queue,
    jobId,
  };
};
