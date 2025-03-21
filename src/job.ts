import { Pool } from './pool.js';
import { PoolClient } from 'pg';

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

export interface ProcessingJob<
  T extends Record<string, any> = Record<string, any>,
> {
  getId(): string;
  getType(): string;
  getPayload(): T;
}

export interface ControllingJob {
  complete(): Promise<void>;
  fail(): Promise<void>;
  requeue(): Promise<void>;
  kill(): Promise<void>;
}

export interface JobObserver {
  onUpdate: (client: PoolClient) => Promise<void>;
}

class NoopObserver implements JobObserver {
  async onUpdate() {}
}

export class Job<T extends Record<string, any> = Record<string, any>>
  implements ProcessingJob<T>, ControllingJob
{
  private readonly pool: Pool;
  private readonly workerId: string;
  private readonly data: JobData<T>;
  private readonly observer: JobObserver;

  constructor(config: {
    pool: Pool;
    workerId: string;
    data: JobData<T>;
    observer?: JobObserver;
  }) {
    this.pool = config.pool;
    this.workerId = config.workerId;
    this.data = config.data;
    this.observer = config.observer ?? new NoopObserver();
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
    await this.update((client) => {
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
    await this.update((client) => {
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
    await this.update((client) => {
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
    await this.update(async (client) => {
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

  private async update(callback: (client: PoolClient) => Promise<any>) {
    await this.pool.transaction(async (client) => {
      await callback(client);
      await this.observer.onUpdate(client);
    });
  }
}
