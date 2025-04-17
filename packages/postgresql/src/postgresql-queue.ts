import {
  BackoffCatalog,
  BaseJobData,
  BuiltJob,
  CreateQueueParams,
  DateProvider,
  DefaultJob,
  JobBuilder,
  JobSpec,
  Looper,
  NonAcquiredJob,
  Processor,
  Queue,
  randomUuid,
  ScheduleCatalog,
} from '@racyn/kujob-core';
import { Pool } from './pool.js';
import { AddJobsCommand } from './add-jobs-command.js';

export class PostgresqlQueue implements Queue {
  private name: string;
  private queueId: string | null = null;
  private workerId = randomUuid();
  private processor: Processor | null = null;
  private jobsLooper: Looper;
  private dateProvider: DateProvider;
  private pool: Pool;

  constructor(props: {
    params: CreateQueueParams;
    pool: Pool;
    jobsLooper: Looper;
    dateProvider: DateProvider;
  }) {
    this.name = props.params.name;
    this.jobsLooper = props.jobsLooper;
    this.dateProvider = props.dateProvider;
    this.jobsLooper.configure(() => this.processJobs());
  }

  async initialize(): Promise<void> {
    await this.pool.transaction(async (client) => {
      const queueResult = await client.query(
        'INSERT INTO job_queues (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = $1 RETURNING id',
        [this.name],
      );

      this.queueId = queueResult.rows[0].id;
    });
  }

  createJob<T extends BaseJobData>(data: T): JobBuilder {
    return new JobBuilder({
      data,
      queue: this,
    });
  }

  async addJob(job: JobBuilder): Promise<BuiltJob> {
    const result = await new AddJobsCommand({
      pool: this.pool,
      queueId: this.queueId,
      dateProvider: this.dateProvider,
    }).execute([job.build()]);

    return result[0];
  }

  addJobs(jobs: JobBuilder[]): Promise<BuiltJob[]> {
    return new AddJobsCommand({
      pool: this.pool,
      queueId: this.queueId,
      dateProvider: this.dateProvider,
    }).execute(jobs.map((job) => job.build()));
  }

  async addJobSpec(job: JobSpec): Promise<BuiltJob> {
    const result = await new AddJobsCommand({
      pool: this.pool,
      queueId: this.queueId,
      dateProvider: this.dateProvider,
    }).execute([job]);

    return result[0];
  }

  async readJob<T extends BaseJobData>(
    id: string,
  ): Promise<NonAcquiredJob<T> | null> {
    const result = await this.pool.query(async (client) =>
      client.query(`SELECT * FROM jobs WHERE id = $1`),
    );

    if (result.rowCount === 0) {
      return null;
    }

    return this.sqlToJobData(result.rows[0]);
  }

  setProcessor(processor: Processor): void {
    this.processor = processor;
  }

  startProcessing(): void {
    this.jobsLooper.start();
  }

  stopProcessing(): void {
    this.jobsLooper.stop();
  }

  setLooper(looper: Looper) {
    this.jobsLooper = looper;
    this.jobsLooper.configure(() => this.processJobs());
  }

  getName(): string {
    return this.name;
  }

  private async processJobs(): Promise<void> {
    const processor = this.processor;
    const result = await this.pool.transaction(async (client) => {
      const jobsToFetch = 100;
      return client.query(
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
    });

    result.rows
      .map((row) => this.sqlToJobData(row))
      .forEach((job) => {
        setImmediate(async () => {
          try {
            await processor.process(job);
            await job.complete();
          } catch (e) {
            await job.fail(e);
          } finally {
            job.release();
          }

          await this.saveJob(job);
        });
      });
  }

  private sqlToJobData<T>(result: any): DefaultJob<T> {
    return new DefaultJob({
      state: {
        id: result.id,
        queueId: result.queue_id,
        workerId: result.worker_id,
        attemptsMax: result.attempts_max,
        attemptsDone: result.attempts_done,
        priority: result.priority,
        data: result.data,
        status: result.status,
        backoff: BackoffCatalog.deserialize(result.backoff).getOrThrow(
          'Unrecognized backoff',
        ),
        schedule: ScheduleCatalog.deserialize(result.schedule).getOrThrow(
          'Unrecognized backoff',
        ),
        createdAt: result.created_at,
        startedAt: result.started_at,
        scheduledAt: result.scheduled_at,
        updatedAt: result.updated_at,
        finishedAt: result.finished_at,
        failureReason: result.failure_reason,
      },
      dateProvider: this.dateProvider,
    });
  }

  private async saveJob(job: DefaultJob<any>) {
    const state = job.getState();
    await this.pool.transaction(async (client) => {
      await client.query(
        `UPDATE jobs 
         SET worker_id = $1,
             attempts_max = $2,
             attempts_done = $3,
             priority = $4,
             data = $5,
             status = $6,
             backoff = $7,
             schedule = $8,
             started_at = $9,
             scheduled_at = $10,
             updated_at = $11,
             finished_at = $12,
             failure_reason = $13
         WHERE id = $14`,
        [
          state.workerId,
          state.attemptsMax,
          state.attemptsDone,
          state.priority,
          JSON.stringify(state.data),
          state.status,
          JSON.stringify(state.backoff.serialize()),
          JSON.stringify(state.schedule.serialize()),
          state.startedAt,
          state.scheduledAt,
          state.updatedAt,
          state.finishedAt,
          state.failureReason,
          job.getId(),
        ],
      );
    });
  }
}
