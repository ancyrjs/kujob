import pg from 'pg';
import { Pool } from './pool.js';
import { Queue } from './queue/queue.js';
import { Logger } from './loggers/logger.js';
import { ConsoleLogger } from './loggers/console-logger.js';
import { DefaultMigrator, Migrator } from './migrator/migrator.js';
import { PoolFactory } from './pool-factory/pool-factory.js';
import { Poller } from './poller/poller.js';
import { DefaultPoller } from './poller/default-poller.js';
import { Limiter } from './queue/limiter.js';

export class Kujob {
  private pool: pg.Pool;
  private logger: Logger;
  private migrator: Migrator;
  private poller: Poller;

  constructor(props: {
    poolFactory: PoolFactory;
    logger?: Logger;
    migrator?: Migrator;
    poller?: Poller;
  }) {
    this.pool = props.poolFactory.createPool();
    this.logger = props.logger ?? new ConsoleLogger();
    this.migrator =
      props.migrator ??
      new DefaultMigrator({ pool: this.pool, logger: this.logger });
    this.poller = props.poller ?? new DefaultPoller({});
  }

  async start() {
    await this.migrator.scafold();
  }

  async purge() {
    await this.migrator.truncate();
  }

  async end() {
    return this.pool.end();
  }

  async createQueue(
    queueName: string,
    props?: {
      poller?: Poller;
      logger?: Logger;
      limiter?: Limiter;
    },
  ) {
    const queue = new Queue({
      pool: new Pool({ pool: this.pool }),
      queueName,
      logger: props?.logger ?? this.logger,
      poller: props?.poller ?? this.poller,
      limiter: props?.limiter,
    });

    await queue.initialize();
    return queue;
    é;
  }

  setLogger(logger: Logger) {
    this.logger = logger;
  }
}
