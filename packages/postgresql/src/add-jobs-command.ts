import { Pool } from './pool.js';
import {
  BuiltJob,
  CurrentDateProvider,
  DateProvider,
  DefaultJob,
  DefaultJobState,
  JobSpec,
} from '@racyn/kujob-core';

/**
 * Abstract the operation of adding jobs to the queue
 */
export class AddJobsCommand {
  static DEFAULT_CHUNK_SIZE = 1000;

  private pool: Pool;
  private queueId: string;
  private chunkSize: number;
  private dateProvider: DateProvider;

  constructor(props: {
    pool: Pool;
    queueId: string;
    chunkSize?: number;
    dateProvider?: DateProvider;
  }) {
    this.pool = props.pool;
    this.queueId = props.queueId;
    this.chunkSize = props.chunkSize ?? AddJobsCommand.DEFAULT_CHUNK_SIZE;
    this.dateProvider = props.dateProvider ?? CurrentDateProvider.INSTANCE;
  }

  async execute(builders: JobSpec[]): Promise<BuiltJob[]> {
    if (builders.length === 0) {
      return [];
    }

    const jobs = builders.map((builder) => this.createJob(builder));
    const chunks = this.chunkJobs(jobs);
    const queries = chunks.map((chunk) => this.toInsertQuery(chunk));

    // transactional bulk insert
    await this.pool.transaction(async (client) => {
      // Note : does it make sense to run it sequentially or can we run them in Promise.all ?
      for (const { queryText, queryParams } of queries) {
        await client.query(queryText, queryParams);
      }
    });

    // Return all job IDs
    return jobs.map((job) => ({
      id: job.id,
    }));
  }

  /**
   * Create a job object and supply default values
   * @param spec
   * @private
   */
  private createJob(spec: JobSpec): DefaultJobState {
    return DefaultJob.fromSpec(spec, {
      queueId: this.queueId,
      dateProvider: this.dateProvider,
    }).getState();
  }

  /**
   * Split the jobs into chunks
   * @param jobs
   * @private
   */
  private chunkJobs<T>(jobs: T[]) {
    const out: T[][] = [];

    for (let i = 0; i < jobs.length; i += this.chunkSize) {
      const chunk = jobs.slice(i, i + this.chunkSize);
      out.push(chunk);
    }

    return out;
  }

  /**
   * Group the jobs into a single insert query
   * @param jobs
   * @private
   */
  private toInsertQuery(jobs: DefaultJobState[]) {
    const valueStrings = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    for (const job of jobs) {
      valueStrings.push(
        `(`,
        `$${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, `,
        `$${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9}, `,
        `$${paramIndex + 10}, $${paramIndex + 11}, $${paramIndex + 12}, $${paramIndex + 13}, $${paramIndex + 14}, `,
        `$${paramIndex + 15}`,
        `)`,
      );

      queryParams.push(
        job.id,
        this.queueId,
        null,
        job.attemptsMax,
        job.attemptsDone,
        job.priority,
        JSON.stringify(job.data),
        job.status,
        JSON.stringify(job.backoff.serialize()),
        JSON.stringify(job.schedule.serialize()),
        job.createdAt,
        job.startedAt,
        job.scheduledAt,
        job.updatedAt,
        job.finishedAt,
        null,
      );

      paramIndex += 16;
    }

    const queryText = `
        INSERT INTO jobs VALUES ${valueStrings.join(', ')}
    `;

    return { queryText, queryParams };
  }
}
