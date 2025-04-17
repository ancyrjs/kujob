import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { afterAll, beforeAll, beforeEach, expect, test, vi } from 'vitest';
import {
  AsapBackoff,
  AsapSchedule,
  DelaySchedule,
  Duration,
  JobBuilder,
  LinearBackoff,
} from '@racyn/kujob-core';
import { DefaultPoolFactory, PostgresqlDriver } from '../src/index.js';

let container: StartedPostgreSqlContainer;
let driver: PostgresqlDriver;

beforeAll(async () => {
  container = await new PostgreSqlContainer().start();

  driver = new PostgresqlDriver({
    poolFactory: new DefaultPoolFactory({
      user: container.getUsername(),
      password: container.getPassword(),
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
    }),
  });

  await driver.scaffold();
});

afterAll(async () => {
  await driver.end();
  await container.stop();
});

beforeEach(async () => {
  await driver.purge();
});

test('creating a queue', async () => {
  await driver.createQueue({
    name: 'my-queue',
  });

  const queue = await driver
    .getPool()
    .query((client) =>
      client.query('SELECT * FROM job_queues WHERE name = $1', ['my-queue']),
    );

  expect(queue.rows.length).toBe(1);
  expect(queue.rows[0].name).toBe('my-queue');
});

test('creating a job', async () => {
  const queue = await driver.createQueue({
    name: 'my-queue',
  });

  const { id } = await queue.addJob(
    new JobBuilder({
      data: {
        foo: 'bar',
      },
      queue,
    })
      .priority(5)
      .attempts(3)
      .backoff(new LinearBackoff({ increment: Duration.minutes(5) }))
      .schedule(
        new DelaySchedule({ duration: Duration.minutes(5), repeat: true }),
      ),
  );

  const readJob = await queue.readJob(id);
  expect(readJob.getState()).toEqual({
    id,
    queueName: 'my-queue',
    workerId: null,
    attemptsMax: 3,
    attemptsDone: 0,
    priority: 5,
    backoff: new LinearBackoff({ increment: Duration.minutes(5) }),
    schedule: new DelaySchedule({
      duration: Duration.minutes(5),
      repeat: true,
    }),
    data: {
      foo: 'bar',
    },
    createdAt: expect.any(Date),
    startedAt: null,
    scheduledAt: expect.any(Date),
    updatedAt: null,
    finishedAt: null,
    failureReason: null,
    status: 'waiting',
  });
});

test('processing a job', async () => {
  const queue = await driver.createQueue({
    name: 'my-queue',
  });

  const processor = {
    process: vi.fn(),
    getConcurrency(): number {
      return 1;
    },
  };

  queue.setProcessor(processor);

  const { id } = await queue.addJob(
    new JobBuilder({
      data: {
        foo: 'bar',
      },
      queue,
    })
      .priority(5)
      .attempts(3),
  );

  queue.startProcessing();

  await expect
    .poll(async () => {
      const job = await queue.readJob(id);
      return job.isCompleted();
    })
    .toBe(true);

  queue.stopProcessing();

  const readJob = await queue.readJob(id);
  expect(readJob.getState()).toEqual({
    id,
    queueName: 'my-queue',
    workerId: null,
    attemptsMax: 3,
    attemptsDone: 0,
    priority: 5,
    backoff: new AsapBackoff(),
    schedule: new AsapSchedule(),
    data: {
      foo: 'bar',
    },
    createdAt: expect.any(Date),
    startedAt: expect.any(Date),
    scheduledAt: expect.any(Date),
    updatedAt: expect.any(Date),
    finishedAt: expect.any(Date),
    failureReason: null,
    status: 'completed',
  });
});
