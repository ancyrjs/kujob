import { Kujob } from '@racyn/kujob-core';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { DefaultPoolFactory, PostgresqlDriver } from '@racyn/kujob-postgresql';
import { BaseTester } from './tester.js';

export class PostgresqlTester extends BaseTester {
  // @ts-ignore
  private kujob: Kujob;

  private container: StartedPostgreSqlContainer;

  private driver: PostgresqlDriver;

  async beforeAll() {
    this.container = await new PostgreSqlContainer().start();

    this.driver = new PostgresqlDriver({
      poolFactory: new DefaultPoolFactory({
        user: this.container.getUsername(),
        password: this.container.getPassword(),
        host: this.container.getHost(),
        port: this.container.getPort(),
        database: this.container.getDatabase(),
      }),
    });
    await this.driver.scaffold();

    this.kujob = new Kujob({
      driver: this.driver,
    });
  }

  async beforeEach(): Promise<void> {
    await this.driver.purge();
  }

  async afterAll(): Promise<void> {
    await this.driver.end();
    await this.container.stop();
  }

  getKujob() {
    return this.kujob;
  }

  name(): string {
    return 'postgresql';
  }
}
