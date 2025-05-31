import {
  BackoffCatalog,
  BuiltJob,
  CreateQueueParams,
  DateProvider,
  Job,
  JobBuilder,
  JobData,
  JobSpec,
  Looper,
  NonAcquiredJob,
  Processor,
  Queue,
  randomUuid,
  ScheduleCatalog,
} from '@racyn/kujob-core';
import { PoolClient } from 'pg';

import { Pool } from './pool.js';
import { AddJobsCommand } from './add-jobs-command.js';

export class PostgresqlQueue implements Queue {
  private name: string;
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
    this.pool = props.pool;
    this.jobsLooper = props.jobsLooper;
    this.dateProvider = props.dateProvider;

    this.jobsLooper.configure(() => this.processJobs());
  }

  async initialize(): Promise<void> {
    await this.pool.transaction(async (client) => {
      await client.query(
        'INSERT INTO job_queues (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = $1',
        [this.name],
      );
    });
  }

  createJob<T extends JobData>(data: T): JobBuilder {
    return new JobBuilder({
      data,
      queue: this,
    });
  }

  async addJob(job: JobBuilder): Promise<BuiltJob> {
    const result = await new AddJobsCommand({
      pool: this.pool,
      queueName: this.name,
      dateProvider: this.dateProvider,
    }).execute([job.build()]);

    return result[0];
  }

  addJobs(jobs: JobBuilder[]): Promise<BuiltJob[]> {
    return new AddJobsCommand({
      pool: this.pool,
      queueName: this.name,
      dateProvider: this.dateProvider,
    }).execute(jobs.map((job) => job.build()));
  }

  async addJobSpec(job: JobSpec): Promise<BuiltJob> {
    const result = await new AddJobsCommand({
      pool: this.pool,
      queueName: this.name,
      dateProvider: this.dateProvider,
    }).execute([job]);

    return result[0];
  }

  async readJob<T extends JobData>(
    id: string,
  ): Promise<NonAcquiredJob<T> | null> {
    const result = await this.pool.query(async (client) =>
      client.query(`SELECT * FROM jobs WHERE id = $1`, [id]),
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
    const jobsToFetch = 100;

    const result = await this.pool.transaction(async (client) => {
      // Use the same transaction boundary to update the heartbeat of the worker
      await this.heartbeat(client);

      const allJobs = await client.query(
        `SELECT * FROM jobs
         WHERE queue_name = $1
           AND status = 'waiting'
           AND (scheduled_at <= NOW())
         ORDER BY priority DESC, scheduled_at ASC
         FOR UPDATE SKIP LOCKED
         LIMIT $2`,
        [this.name, jobsToFetch],
      );

      const jobIds = allJobs.rows.map((row) => row.id);

      if (jobIds.length > 0) {
        await client.query(
          `UPDATE jobs 
         SET status = 'processing', 
             updated_at = NOW(), 
             started_at = NOW(), 
             worker_id = $1
            WHERE id = ANY($2)`,
          [this.workerId, jobIds],
        );
      }

      return allJobs;
    });

    await Promise.all(
      result.rows
        .map((row) => this.sqlToJobData(row))
        .map(
          (job) =>
            new Promise<void>((resolve) =>
              setImmediate(async () => {
                job.acquire({ workerId: this.workerId });
                await this.saveJob(job);

                try {
                  await this.processor!.process(job);
                  await job.complete();
                } catch (e) {
                  await job.fail(e);
                } finally {
                  job.release();
                }

                await this.saveJob(job);
                resolve();
              }),
            ),
        ),
    );
  }

  private sqlToJobData<T extends JobData>(result: any): Job<T> {
    return new Job({
      state: {
        id: result.id,
        queueName: result.queue_name,
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
          'Unrecognized schedule',
        ),
        createdAt: this.dateOrThrow(result.created_at),
        startedAt: this.dateOrNull(result.started_at),
        scheduledAt: this.dateOrThrow(result.scheduled_at),
        updatedAt: this.dateOrNull(result.updated_at),
        finishedAt: this.dateOrNull(result.finished_at),
        failureReason: result.failure_reason,
      },
      dateProvider: this.dateProvider,
    });
  }

  private async saveJob(job: Job<any>) {
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

  private dateOrNull(value: string | null): Date | null {
    return value ? new Date(value) : null;
  }

  private dateOrThrow(value: string | null): Date {
    if (!value) {
      throw new Error('Date value is null');
    }

    return new Date(value);
  }

  private async heartbeat(client: PoolClient): Promise<any> {
    return client.query(
      `UPDATE workers 
       SET heartbeat = NOW() 
       WHERE id = $1`,
      [this.workerId],
    );
  }
}
