import { randomUUID } from 'node:crypto';
import { Kujob } from '../../../src/index.js';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { DefaultPoolFactory } from '../../../src/pool-factory/pool-factory.js';
import { DummyWorker } from '../../adapters/dummy-worker.js';

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

const jobsToCreate = 1000;
const jobIds = Array.from({ length: jobsToCreate }, () => randomUUID());

const queue = await kujob.createQueue('queue');
queue.register('job', new DummyWorker());

for (const id of jobIds) {
  await queue.addJob({ type: 'job', id });
}

let completedJobsCount = 0;
let start = Date.now();

do {
  await queue.poll();
  completedJobsCount = await queue.fetchCompletedJobsCount();
} while (completedJobsCount !== jobIds.length);

let end = Date.now();

await queue.stopPolling();

console.log(`Completed ${completedJobsCount} jobs in ${end - start}ms`);

await kujob.end();
