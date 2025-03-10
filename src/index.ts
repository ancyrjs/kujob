import pg from 'pg';
import { Pool } from './pool.js';
import { Queue } from './queue.js';

type ConnectionSettings = {
  user: string;
  password: string;
  host: string;
  port: number;
  database: string;
};

export class Kujob {
  private connection: ConnectionSettings;
  private pool: pg.Pool;

  constructor(props: { connection: ConnectionSettings }) {
    this.connection = props.connection;
    this.pool = new pg.Pool(this.connection);
  }

  async start() {
    await this.pool.query(`
      CREATE TABLE job_queues (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.pool.query(`
      CREATE TABLE jobs (
        id UUID PRIMARY KEY,
        queue_id INTEGER REFERENCES job_queues(id) NOT NULL,
        type VARCHAR(100) NOT NULL,
        payload JSONB NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        started_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        worker_id VARCHAR(100),
        
        CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
      );
    `);

    await this.pool.query(`
        CREATE INDEX idx_jobs_status ON jobs(status);
    `);

    await this.pool.query(`
        CREATE INDEX idx_jobs_queue_status ON jobs(queue_id, status);
    `);
  }

  async purge() {
    await this.pool.query('DELETE FROM jobs');
    await this.pool.query('DELETE FROM job_queues');
  }

  async end() {
    return this.pool.end();
  }

  async createQueue(queueName: string) {
    const queue = new Queue({
      pool: new Pool({ pool: this.pool }),
      queueName,
    });

    await queue.initialize();
    return queue;
  }
}
