import { Job, JobData, ReadOnlyJob } from './job.js';
import { Pool } from './pool.js';
import { Poller } from './poller/poller.js';
import { generateUuid } from './generate-uuid.js';

export interface Worker<T extends Record<string, any> = Record<string, any>> {
  process(job: ReadOnlyJob<T>): Promise<any>;
}

export abstract class BaseWorker<
  T extends Record<string, any> = Record<string, any>,
> implements Worker<T>
{
  // @ts-ignore
  private pool: Pool;
  // @ts-ignore
  private workerId: string;
  // @ts-ignore
  private queueId: number;
  // @ts-ignore
  private poller: Poller;

  inject(config: { pool: Pool; queueId: number; poller: Poller }) {
    this.pool = config.pool;
    this.queueId = config.queueId;
    this.workerId = `worker-${generateUuid()}`;
    this.poller = config.poller;
  }

  abstract process(job: ReadOnlyJob<T>): Promise<any>;

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
        new Job<T>({
          pool: this.pool,
          workerId: this.workerId,
          data: this.sqlToJobData(row),
        }),
    );
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
}
