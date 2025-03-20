import { randomUUID } from 'node:crypto';
import { Pool } from '../pool.js';
import { JobData, WorkingJob } from '../job.js';
import { Logger } from '../loggers/logger.js';
import { ConsoleLogger } from '../loggers/console-logger.js';
import { Worker } from '../worker.js';
import { Poller } from '../poller/poller.js';
import { AddJobInput, AddJobsCommand } from './add-jobs-command.js';

export class Queue {
  private pool: Pool;
  private queueName: string;
  private workerId: string;
  private queueId: number;
  private handlers: Map<string, Worker> = new Map();
  private logger: Logger;
  private poller: Poller;

  constructor(config: {
    pool: Pool;
    queueName: string;
    logger?: Logger;
    poller: Poller;
  }) {
    this.pool = config.pool;
    this.queueName = config.queueName;
    this.workerId = `worker-${randomUUID()}`;
    this.queueId = 0;
    this.logger = config.logger ?? new ConsoleLogger();
    this.poller = config.poller;
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
    // warn for jobs that can't be handled
    jobs.forEach((job) => {
      if (!this.handlers.has(job.type)) {
        this.logger.warn(`No handler registered for job type: ${job.type}`);
      }
    });

    return new AddJobsCommand({
      pool: this.pool,
      queueId: this.queueId,
      logger: this.logger,
    }).execute(jobs);
  }

  /**
   * Acquire the next jobs to process
   * @param count
   */
  async acquireNextJobs({ count }: { count: number }): Promise<WorkingJob[]> {
    const result = await this.pool.runInTransaction(async (client) =>
      client.query(
        `UPDATE jobs 
         SET status = 'processing', 
             updated_at = NOW(), 
             started_at = NOW(), 
             worker_id = $1
         WHERE id IN (
           SELECT id FROM jobs 
           WHERE queue_id = $2 AND status = 'pending'
           AND (scheduled_for <= NOW())
           ORDER BY priority DESC, enqueued_at ASC
           FOR UPDATE SKIP LOCKED
           LIMIT $3
         )
         RETURNING *`,
        [this.workerId, this.queueId, count],
      ),
    );

    return result.rows.map(
      (row) =>
        new WorkingJob({
          pool: this.pool,
          workerId: this.workerId,
          data: this.sqlToJobData(row),
        }),
    );
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
    const workingJobs = await this.acquireNextJobs({ count: 1 });
    if (workingJobs.length === 0) {
      return;
    }

    await this.processJob(workingJobs[0]);
  }

  /**
   * Process the job and manage its lifecycle
   * @param job
   */
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

  /**
   * Begin polling for jobs
   * This method will not return until the polling is stopped so it should not be awaited
   */
  startPolling() {
    return this.poller.start(this);
  }

  /**
   * Stop polling for jobs
   */
  stopPolling() {
    return this.poller.stop();
  }

  /**
   * Fetch the number completed jobs in the queue
   * @returns Number of completed jobs
   */
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
