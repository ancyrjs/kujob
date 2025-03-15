import { Pool } from './pool.js';

export interface JobData<T extends Record<string, any> = Record<string, any>> {
  id: string;
  type: string;
  payload: T;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'dead';
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  workerId: string | null;
}

export class WorkingJob<T extends Record<string, any> = Record<string, any>> {
  private pool: Pool;
  private workerId: string;
  private data: JobData<T>;

  constructor(config: { pool: Pool; workerId: string; data: JobData<T> }) {
    this.pool = config.pool;
    this.workerId = config.workerId;
    this.data = config.data;
  }

  getType() {
    return this.data.type;
  }

  getPayload() {
    return this.data.payload;
  }

  async complete(): Promise<void> {
    await this.pool.runInTransaction((client) => {
      return client.query(
        `UPDATE jobs 
         SET status = 'completed', 
             updated_at = NOW(), 
             completed_at = NOW()
         WHERE id = $1 AND worker_id = $2`,
        [this.data.id, this.workerId],
      );
    });

    this.data.updatedAt = new Date();
    this.data.completedAt = new Date();
    this.data.status = 'completed';
  }

  async fail(): Promise<void> {
    await this.pool.runInTransaction((client) => {
      return client.query(
        `UPDATE jobs 
         SET status = 'failed', 
             updated_at = NOW()
         WHERE id = $1 AND worker_id = $2`,
        [this.data.id, this.workerId],
      );
    });

    this.data.updatedAt = new Date();
    this.data.status = 'failed';
  }

  async requeue(): Promise<void> {
    await this.pool.runInTransaction((client) => {
      return client.query(
        `UPDATE jobs
         SET status = 'pending',
             updated_at = NOW(),
             started_at = NULL,
             worker_id = NULL
         WHERE id = $1 AND worker_id = $2`,
        [this.data.id, this.workerId],
      );
    });

    this.data.updatedAt = new Date();
    this.data.status = 'processing';
  }

  async kill(): Promise<void> {
    await this.pool.runInTransaction((client) => {
      return client.query(
        `UPDATE jobs 
         SET status = 'dead', 
             updated_at = NOW(), 
             started_at = NULL, 
             worker_id = NULL
         WHERE id = $1 AND worker_id = $2`,
        [this.data.id, this.workerId],
      );
    });

    this.data.updatedAt = new Date();
    this.data.status = 'dead';
  }
}
