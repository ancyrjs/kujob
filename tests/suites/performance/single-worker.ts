import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { Kujob } from '../../../src/index.js';
import { DefaultPoolFactory } from '../../../src/pool-factory/pool-factory.js';
import { DummyWorker } from '../../adapters/dummy-worker.js';
import { generateUuid } from '../../../src/generate-uuid.js';

class Timer {
  static wrap<T>(fn: () => Promise<T>): Promise<{ result: T; time: number }> {
    let start = Date.now();
    return fn().then((result) => {
      let end = Date.now();
      return { result, time: end - start };
    });
  }
}

const container = await new PostgreSqlContainer().start();
const kujob = new Kujob({
  poolFactory: new DefaultPoolFactory({
    user: container.getUsername(),
    password: container.getPassword(),
    host: container.getHost(),
    port: container.getPort(),
    database: container.getDatabase(),
  }),
});

await kujob.start();

const jobsToCreate = 10_000;
const jobIds = Array.from({ length: jobsToCreate }, () => generateUuid());

const queue = await kujob.createQueue('queue');
const worker = new DummyWorker();
queue.register(worker);

let result = await Timer.wrap<any>(() =>
  queue.addJobs(jobIds.map((jobId) => ({ type: 'job', id: jobId }))),
);

console.log(`Created ${jobsToCreate} jobs in ${result.time}ms`);

let completedJobsCount = 0;

result = await Timer.wrap<any>(async () => {
  do {
    await worker.startPolling();
    completedJobsCount = await queue.fetchCompletedJobsCount();
  } while (completedJobsCount !== jobIds.length);
});

console.log(`Completed ${completedJobsCount} jobs in ${result.time}ms`);

await worker.stopPolling();
await kujob.end();
