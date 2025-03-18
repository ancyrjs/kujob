import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { Kujob } from '../../src/index.js';
import { DefaultPoolFactory } from '../../src/pool-factory/pool-factory.js';

export class Tester {
  // @ts-ignore
  private kujob: Kujob;

  // @ts-ignore
  private container: StartedPostgreSqlContainer;

  async beforeAll() {
    this.container = await new PostgreSqlContainer().start();

    this.kujob = new Kujob({
      poolFactory: new DefaultPoolFactory({
        user: this.container.getUsername(),
        password: this.container.getPassword(),
        host: this.container.getHost(),
        port: this.container.getPort(),
        database: this.container.getDatabase(),
      }),
    });

    await this.kujob.start();
  }

  async beforeEach() {
    await this.kujob.purge();
  }

  async afterAll() {
    await this.kujob.end();
    await this.container.stop();
  }

  getKujob() {
    return this.kujob;
  }
}
