import { Pool as PgPool } from 'pg';

export interface Migrator {
  scaffold(): Promise<void>;

  truncate(): Promise<void>;

  drop(): Promise<void>;
}

export class DefaultMigrator implements Migrator {
  private pool: PgPool;

  constructor(props: { pool: PgPool }) {
    this.pool = props.pool;
  }

  async scaffold() {
    await this.pool.query(`
        CREATE TABLE IF NOT EXISTS job_queues
        (
            name       VARCHAR(100) PRIMARY KEY,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await this.pool.query(`
        CREATE TABLE IF NOT EXISTS jobs
        (
            id              UUID PRIMARY KEY,
            queue_name      VARCHAR(100) REFERENCES job_queues (name) NOT NULL,
            worker_id       VARCHAR(100)                       NULL,
            attempts_max    INTEGER                            NOT NULL DEFAULT 1,
            attempts_done   INTEGER                            NOT NULL DEFAULT 0,
            priority        INTEGER                            NOT NULL DEFAULT 0,
            data            JSONB                              NOT NULL,
            status          VARCHAR(20)                        NOT NULL DEFAULT 'pending',
            backoff         JSONB                              NULL,
            schedule        JSONB                              NULL,
            created_at      TIMESTAMP WITH TIME ZONE                    DEFAULT CURRENT_TIMESTAMP,
            started_at      TIMESTAMP WITH TIME ZONE                    DEFAULT CURRENT_TIMESTAMP,
            scheduled_at    TIMESTAMP WITH TIME ZONE                    DEFAULT CURRENT_TIMESTAMP,
            updated_at      TIMESTAMP WITH TIME ZONE                    DEFAULT CURRENT_TIMESTAMP,
            finished_at     TIMESTAMP WITH TIME ZONE,
            failure_reason  TEXT                               NULL,

            CONSTRAINT valid_status CHECK (status IN ('waiting', 'processing', 'completed', 'failed'))
        );
    `);

    await this.pool.query(`
        CREATE TABLE IF NOT EXISTS workers
        (
            id              VARCHAR(100) PRIMARY KEY,
            created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            heartbeat       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await this.pool.query(`
        CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (status);
    `);

    await this.pool.query(`
        CREATE INDEX IF NOT EXISTS idx_jobs_queue_status ON jobs (queue_name, status);
    `);
  }

  async truncate() {
    await this.pool.query('DELETE FROM jobs');
    await this.pool.query('DELETE FROM job_queues');
    await this.pool.query('DELETE FROM workers');
  }

  async drop() {
    await this.pool.query('DROP TABLE IF EXISTS jobs');
    await this.pool.query('DROP TABLE IF EXISTS job_queues');
    await this.pool.query('DROP TABLE IF EXISTS workers');
  }
}
