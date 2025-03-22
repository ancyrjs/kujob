import { Job, JobData, JobObserver, ProcessingJob } from './job.js';
import { Pool } from './pool.js';
import { Poller } from './poller/poller.js';
import { generateUuid } from './generate-uuid.js';
import { PoolClient } from 'pg';
import { Limiter } from './queue/limiter.js';

export interface Worker<T extends Record<string, any> = Record<string, any>> {
  process(job: ProcessingJob<T>): Promise<any>;
  getId(): string;
  processNextJob(): Promise<void>;
  startPolling(): void;
  stopPolling(): void;
}

export abstract class BaseWorker<
  T extends Record<string, any> = Record<string, any>,
> implements Worker<T>
{
  private workerId: string = `worker-${generateUuid()}`;

  // @ts-ignore
  private pool: Pool;
  // @ts-ignore
  private queueId: number;
  // @ts-ignore
  private poller: Poller;
  // @ts-ignore
  private limiter: Limiter;

  /**
   * Those properties are injected later in the object lifecycle because
   * the worker itself is created by the user and may contain their own
   * set of dependencies. We don't want clients to know about these dependencies
   * as it would hinder our capacity to change them in the future, so while this
   * pattern is not ideal, it's the best we can do for now.
   * @param config
   */
  inject(config: {
    pool: Pool;
    queueId: number;
    poller: Poller;
    limiter: Limiter;
  }) {
    this.pool = config.pool;
    this.queueId = config.queueId;
    this.poller = config.poller;
    this.limiter = config.limiter;
  }

  /**
   * The actual method that does the processing
   * @param job
   */
  abstract process(job: ProcessingJob<T>): Promise<any>;

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
  async processJob(job: Job<T>) {
    try {
      await this.process(job);
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
   * Acquire the next jobs to process
   * @param count
   */
  async acquireNextJobs({ count }: { count: number }): Promise<Job<T>[]> {
    const result = await this.pool.transaction(async (client) => {
      const jobsToFetch = await this.limiter.jobsToFetch({
        desired: count,
        client,
      });

      if (jobsToFetch === 0) {
        return [];
      }

      const result = await client.query(
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
        [this.workerId, this.queueId, jobsToFetch],
      );

      await this.heartbeat(client);

      return result.rows;
    });

    return result.map(
      (row) =>
        new Job<T>({
          pool: this.pool,
          workerId: this.workerId,
          data: this.sqlToJobData(row),
          observer: this.createJobObserver(),
        }),
    );
  }

  getId(): string {
    return this.workerId;
  }

  private sqlToJobData(data: any): JobData<T> {
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

  private async heartbeat(client: PoolClient): Promise<any> {
    return client.query(
      `UPDATE workers 
       SET heartbeat = NOW() 
       WHERE id = $1`,
      [this.workerId],
    );
  }

  private createJobObserver(): JobObserver {
    return {
      onUpdate: (client) => this.heartbeat(client),
    };
  }
}
