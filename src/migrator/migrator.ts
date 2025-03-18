import pg from 'pg';
import { Logger } from '../loggers/logger.js';

export interface Migrator {
  scafold(): Promise<void>;

  truncate(): Promise<void>;

  drop(): Promise<void>;
}

export class DefaultMigrator implements Migrator {
  private pool: pg.Pool;
  private logger: Logger;

  constructor(props: { pool: pg.Pool; logger: Logger }) {
    this.pool = props.pool;
    this.logger = props.logger;
  }

  async scafold() {
    await this.pool.query(`
        CREATE TABLE IF NOT EXISTS job_queues
        (
            id         SERIAL PRIMARY KEY,
            name       VARCHAR(100) UNIQUE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await this.pool.query(`
        CREATE TABLE IF NOT EXISTS jobs
        (
            id           UUID PRIMARY KEY,
            queue_id     INTEGER REFERENCES job_queues (id) NOT NULL,
            type         VARCHAR(100)                       NOT NULL,
            payload      JSONB                              NOT NULL,
            priority     INTEGER                            NOT NULL DEFAULT 0,
            status       VARCHAR(20)                        NOT NULL DEFAULT 'pending',
            created_at   TIMESTAMP WITH TIME ZONE                    DEFAULT CURRENT_TIMESTAMP,
            updated_at   TIMESTAMP WITH TIME ZONE                    DEFAULT CURRENT_TIMESTAMP,
            started_at   TIMESTAMP WITH TIME ZONE,
            completed_at TIMESTAMP WITH TIME ZONE,
            worker_id    VARCHAR(100),

            CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'dead'))
        );
    `);

    await this.pool.query(`
        CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (status);
    `);

    await this.pool.query(`
        CREATE INDEX IF NOT EXISTS idx_jobs_queue_status ON jobs (queue_id, status);
    `);
  }

  async truncate() {
    await this.pool.query('DELETE FROM jobs');
    await this.pool.query('DELETE FROM job_queues');
  }

  async drop() {
    await this.pool.query('DROP TABLE IF EXISTS jobs');
    await this.pool.query('DROP TABLE IF EXISTS job_queues');
  }
}
