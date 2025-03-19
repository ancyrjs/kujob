import { Pool } from './pool.js';

export interface JobData<T extends Record<string, any> = Record<string, any>> {
  id: string;
  type: string;
  payload: T;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'dead';
  priority: number;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
  enqueuedAt: Date;
  scheduledFor: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  workerId: string | null;
}

export interface ReadOnlyJob<
  T extends Record<string, any> = Record<string, any>,
> {
  getId(): string;
  getType(): string;
  getPayload(): T;
}

export interface ControllableJob {
  complete(): Promise<void>;
  fail(): Promise<void>;
  requeue(): Promise<void>;
  kill(): Promise<void>;
}

export class WorkingJob<T extends Record<string, any> = Record<string, any>>
  implements ReadOnlyJob<T>, ControllableJob
{
  private readonly pool: Pool;
  private readonly workerId: string;
  private readonly data: JobData<T>;

  constructor(config: { pool: Pool; workerId: string; data: JobData<T> }) {
    this.pool = config.pool;
    this.workerId = config.workerId;
    this.data = config.data;
  }

  getId() {
    return this.data.id;
  }

  getType() {
    return this.data.type;
  }

  getPayload() {
    return this.data.payload;
  }

  async failed() {
    if (this.data.attempts === 1) {
      await this.fail();
    } else {
      await this.requeue();
    }
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
  }

  async requeue(): Promise<void> {
    await this.pool.runInTransaction((client) => {
      return client.query(
        `UPDATE jobs
         SET status = 'pending',
             attempts = attempts - 1,
             enqueued_at = NOW(),
             updated_at = NOW(),
             started_at = NULL,
             worker_id = NULL
         WHERE id = $1 AND worker_id = $2`,
        [this.data.id, this.workerId],
      );
    });
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
  }
}
