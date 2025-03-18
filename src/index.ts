import pg from 'pg';
import { Pool } from './pool.js';
import { Queue } from './queue.js';
import { Logger } from './loggers/logger.js';
import { ConsoleLogger } from './loggers/console-logger.js';
import { DefaultMigrator, Migrator } from './migrator/migrator.js';
import { PoolFactory } from './pool-factory/pool-factory.js';

export class Kujob {
  private pool: pg.Pool;
  private logger: Logger;
  private migrator: Migrator;

  constructor(props: {
    poolFactory: PoolFactory;
    logger?: Logger;
    migrator?: Migrator;
  }) {
    this.pool = props.poolFactory.createPool();
    this.logger = props.logger ?? new ConsoleLogger();
    this.migrator =
      props.migrator ??
      new DefaultMigrator({ pool: this.pool, logger: this.logger });
  }

  async start() {
    await this.migrator.scafold();
  }

  async purge() {
    await this.migrator.purge();
  }

  async end() {
    return this.pool.end();
  }

  async createQueue(queueName: string) {
    const queue = new Queue({
      pool: new Pool({ pool: this.pool }),
      queueName,
      logger: this.logger,
    });

    await queue.initialize();
    return queue;
  }

  setLogger(logger: Logger) {
    this.logger = logger;
  }
}
