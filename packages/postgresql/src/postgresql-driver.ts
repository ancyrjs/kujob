import {
  CreateQueueParams,
  CurrentDateProvider,
  DateProvider,
  Driver,
  Looper,
  Queue,
  TimeoutLooper,
} from '@racyn/kujob-core';
import { Pool as PgPool } from 'pg';
import { PostgresqlQueue } from './postgresql-queue.js';
import { DefaultMigrator, Migrator } from './migrator.js';
import { PoolFactory } from './pool-factory.js';
import { Pool } from './pool.js';

export class PostgresqlDriver implements Driver {
  private pool: PgPool;
  private looper: Looper;
  private dateProvider: DateProvider;
  private migrator: Migrator;

  constructor({
    poolFactory,
    looper,
    dateProvider,
    migrator,
  }: {
    poolFactory: PoolFactory;
    looper?: Looper;
    dateProvider?: DateProvider;
    migrator?: Migrator;
  }) {
    this.pool = poolFactory.createPool();
    this.looper = looper ?? new TimeoutLooper();
    this.dateProvider = dateProvider ?? CurrentDateProvider.INSTANCE;
    this.migrator = migrator ?? new DefaultMigrator({ pool: this.pool });
  }

  async scaffold() {
    await this.migrator.scaffold();
  }

  async purge() {
    await this.migrator.truncate();
  }

  async end() {
    return this.pool.end();
  }

  getPool() {
    return new Pool({ pool: this.pool });
  }

  async createQueue(params: CreateQueueParams): Promise<Queue> {
    const queue = new PostgresqlQueue({
      params,
      pool: new Pool({ pool: this.pool }),
      jobsLooper: this.looper.clone(),
      dateProvider: this.dateProvider,
    });

    await queue.initialize();

    return queue;
  }
}
