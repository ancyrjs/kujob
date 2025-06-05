import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { DefaultPoolFactory } from './pool-factory.js';
import { DefaultMigrator } from './migrator.js';
import { Pool as PgPool } from 'pg';

let container: StartedPostgreSqlContainer;
let pool: PgPool;
let migrator: DefaultMigrator;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:17').start();

  const poolFactory = new DefaultPoolFactory({
    user: container.getUsername(),
    password: container.getPassword(),
    host: container.getHost(),
    port: container.getPort(),
    database: container.getDatabase(),
  });

  pool = poolFactory.createPool();

  migrator = new DefaultMigrator({ pool });
});

afterAll(async () => {
  await pool.end();
  await container.stop();
});

test('scaffolding', async () => {
  await migrator.scaffold();

  const tables = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
  );

  expect(tables.rows).toContainEqual({ table_name: 'job_queues' });
  expect(tables.rows).toContainEqual({ table_name: 'jobs' });
  expect(tables.rows).toContainEqual({ table_name: 'workers' });
});

test('dropping', async () => {
  await migrator.scaffold();
  await migrator.drop();

  const tables = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
  );

  expect(tables.rowCount).toBe(0);
});
