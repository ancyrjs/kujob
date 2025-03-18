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
  private pollId: NodeJS.Timeout | null = null;

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

  /**
   * Add a job to the queue
   * @param config
   */
  async addJob(config: {
    type: string;
    id?: string;
    payload?: Record<string, any>;
    priority?: number;
    attempts?: number;
  }): Promise<string> {
    if (!this.handlers.has(config.type)) {
      this.logger.warn(`No handler registered for job type: ${config.type}`);
    }

    const jobId = config.id ?? randomUUID();
    const payload = config.payload ?? {};
    const priority = config.priority ?? 0;
    const attempts = config.attempts ?? 1;

    await this.pool.runInTransaction(async (client) => {
      await client.query(
        'INSERT INTO jobs (id, queue_id, type, payload, priority, attempts) VALUES ($1, $2, $3, $4, $5, $6)',
        [
          jobId,
          this.queueId,
          config.type,
          JSON.stringify(payload),
          priority,
          attempts,
        ],
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
           ORDER BY priority DESC, enqueued_at ASC
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

    return new WorkingJob({
      pool: this.pool,
      workerId: this.workerId,
      data: this.sqlToJobData(result.rows[0]),
    });
  }

  private sqlToJobData(data: any): JobData {
    return {
      id: data.id,
      type: data.type,
      payload: data.payload,
      status: data.status,
      priority: data.priority,
      attempts: data.attempts,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      enqueuedAt: data.enqueuedAt,
      startedAt: data.started_at ?? null,
      completedAt: data.completed_at ?? null,
      workerId: data.worker_id ?? null,
    };
  }

  /**
   * Read job's data
   * @param id
   */
  async readJob(id: string): Promise<JobData | null> {
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

    return this.sqlToJobData(result.rows[0]);
  }

  /**
   * Register the worker as the processor for the given job type
   * @param type
   * @param worker
   */
  register(type: string, worker: Worker) {
    this.handlers.set(type, worker);
  }

  /**
   * Acquire the next job and process it.
   * If no worker can process the job, the job is killed
   */
  async processNextJob() {
    const workingJob = await this.acquireNextJob();
    if (!workingJob) {
      return;
    }

    return this.processJob(workingJob);
  }

  async processJob(job: WorkingJob) {
    const worker = this.handlers.get(job.getType());

    if (!worker) {
      await job.kill();
      return;
    }

    try {
      await worker.process(job);
      await job.complete();
    } catch (error) {
      await job.failed();
    }
  }

  async poll() {
    let job = null;
    do {
      job = await this.acquireNextJob();
      if (job) {
        const jobToProcess = job;
        setImmediate(() => {
          this.processJob(jobToProcess);
        });
      }
    } while (job !== null);

    this.pollId = setTimeout(() => {
      this.poll();
    }, 50);
  }

  stopPolling() {
    if (this.pollId) {
      clearTimeout(this.pollId);
      this.pollId = null;
    }
  }

  fetchCompletedJobsCount(): Promise<number> {
    return this.pool.runInTransaction(async (client) => {
      const result = await client.query(
        `SELECT COUNT(*) FROM jobs WHERE queue_id = $1 AND status = 'completed'`,
        [this.queueId],
      );

      return parseInt(result.rows[0].count, 10);
    });
  }
}
