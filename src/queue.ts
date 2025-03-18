import { randomUUID } from 'node:crypto';
import { Pool } from './pool.js';
import { JobData, WorkingJob } from './job.js';
import { Logger } from './loggers/logger.js';
import { ConsoleLogger } from './loggers/console-logger.js';
import { Worker } from './worker.js';

export class Queue {
  private pool: Pool;
  private queueName: string;
  private workerId: string;
  private queueId: number;
  private handlers: Map<string, Worker> = new Map();
  private logger: Logger;

  constructor(config: { pool: Pool; queueName: string; logger?: Logger }) {
    this.pool = config.pool;
    this.queueName = config.queueName;
    this.workerId = `worker-${randomUUID()}`;
    this.queueId = 0;
    this.logger = config.logger ?? new ConsoleLogger();
  }

  async initialize() {
    await this.pool.runInTransaction(async (client) => {
      const queueResult = await client.query(
        'INSERT INTO job_queues (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = $1 RETURNING id',
        [this.queueName],
      );

      this.queueId = queueResult.rows[0].id;
    });
  }

  async addJob(config: {
    type: string;
    payload: Record<string, any>;
  }): Promise<string> {
    if (!this.handlers.has(config.type)) {
      this.logger.warn(`No handler registered for job type: ${config.type}`);
    }

    const jobId = randomUUID();

    await this.pool.runInTransaction(async (client) => {
      await client.query(
        'INSERT INTO jobs (id, queue_id, type, payload) VALUES ($1, $2, $3, $4)',
        [jobId, this.queueId, config.type, JSON.stringify(config.payload)],
      );
    });

    return jobId;
  }

  /**
   * Fetch the next job from the queue and lock it
   */
  async acquireNextJob(): Promise<WorkingJob | null> {
    const result = await this.pool.runInTransaction(async (client) =>
      client.query(
        `UPDATE jobs 
         SET status = 'processing', 
             updated_at = NOW(), 
             started_at = NOW(), 
             worker_id = $1
         WHERE id = (
           SELECT id FROM jobs 
           WHERE queue_id = $2 AND status = 'pending'
           ORDER BY created_at ASC
           FOR UPDATE SKIP LOCKED
           LIMIT 1
         )
         RETURNING *`,
        [this.workerId, this.queueId],
      ),
    );

    if (result.rows.length === 0) {
      return null;
    }

    const data = result.rows[0];
    return new WorkingJob({
      pool: this.pool,
      workerId: this.workerId,
      data: {
        id: data.id,
        type: data.type,
        payload: data.payload,
        status: data.status,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        startedAt: data.started_at ?? null,
        completedAt: data.completed_at ?? null,
        workerId: data.worker_id ?? null,
      },
    });
  }

  async getJob(id: string): Promise<JobData | null> {
    const result = await this.pool.runInTransaction(async (client) =>
      client.query(
        `
        SELECT * FROM jobs
        WHERE id = $1
        `,
        [id],
      ),
    );

    if (result.rows.length === 0) {
      return null;
    }

    const job = result.rows[0];
    return {
      id: job.id,
      type: job.type,
      payload: job.payload,
      status: job.status,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      startedAt: job.started_at ?? null,
      completedAt: job.completed_at ?? null,
      workerId: job.worker_id ?? null,
    };
  }

  register(type: string, worker: Worker) {
    this.handlers.set(type, worker);
  }

  async processNextJob() {
    const workingJob = await this.acquireNextJob();
    if (!workingJob) {
      return;
    }

    const worker = this.handlers.get(workingJob.getType());

    if (!worker) {
      await workingJob.kill();
      return;
    }

    try {
      await worker.process(workingJob);
      await workingJob.complete();
    } catch (error) {
      await workingJob.fail();
    }
  }
}
