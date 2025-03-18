import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import type { TestProject } from 'vitest/node';
import './context.js';

let container: StartedPostgreSqlContainer;

export const setup = async (project: TestProject) => {
  container = await new PostgreSqlContainer().start();
  project.provide('dbUser', container.getUsername());
  project.provide('dbPassword', container.getPassword());
  project.provide('dbHost', container.getHost());
  project.provide('dbPort', container.getPort());
  project.provide('dbDatabase', container.getDatabase());
};

export const teardown = async () => {
  await container.stop();
};
