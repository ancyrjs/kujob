import { randomUUID } from 'node:crypto';
import { Pool } from '../pool.js';
import { JobData } from '../job.js';
import { Logger } from '../loggers/logger.js';
import { ConsoleLogger } from '../loggers/console-logger.js';
import { BaseWorker } from '../worker.js';
import { Poller } from '../poller/poller.js';
import { AddJobInput, AddJobsCommand } from './add-jobs-command.js';
import { Limiter, UnboundedLimiter } from './limiter.js';

export class Queue {
  private pool: Pool;
  private queueName: string;
  private workerId: string;
  private queueId: number;
  private logger: Logger;
  private poller: Poller;
  private limiter: Limiter;

  constructor(config: {
    pool: Pool;
    queueName: string;
    poller: Poller;
    logger?: Logger;
    limiter?: Limiter;
  }) {
    this.pool = config.pool;
    this.queueName = config.queueName;
    this.workerId = `worker-${randomUUID()}`;
    this.queueId = 0;
    this.poller = config.poller;

    this.logger = config.logger ?? new ConsoleLogger();
    this.limiter = config.limiter ?? new UnboundedLimiter();
  }

  async initialize() {
    await this.pool.transaction(async (client) => {
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
   * @returns Job ID
   */
  async addJob(config: AddJobInput): Promise<string> {
    const result = await this.addJobs([config]);
    return result[0];
  }

  /**
   * Add multiple jobs to the queue
   * @param jobs
   * @returns List of job IDs
   */
  async addJobs(jobs: AddJobInput[]): Promise<string[]> {
    return new AddJobsCommand({
      pool: this.pool,
      queueId: this.queueId,
      logger: this.logger,
    }).execute(jobs);
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
      scheduledFor: data.scheduledFor,
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
    const result = await this.pool.transaction(async (client) =>
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
   * @param worker
   */
  async register(worker: BaseWorker) {
    worker.inject({
      pool: this.pool,
      queueId: this.queueId,
      poller: this.poller.clone(),
      limiter: this.limiter,
    });

    await this.pool.transaction(async (client) => {
      await client.query(
        `
            INSERT INTO workers (id) 
            VALUES ($1) 
            ON CONFLICT (id) 
            DO UPDATE SET heartbeat = NOW()
        `,
        [worker.getId()],
      );
    });
  }

  /**
   * Fetch the number completed jobs in the queue
   * @returns Number of completed jobs
   */
  fetchCompletedJobsCount(): Promise<number> {
    return this.pool.transaction(async (client) => {
      const result = await client.query(
        `SELECT COUNT(*) FROM jobs WHERE queue_id = $1 AND status = 'completed'`,
        [this.queueId],
      );

      return parseInt(result.rows[0].count, 10);
    });
  }
}
