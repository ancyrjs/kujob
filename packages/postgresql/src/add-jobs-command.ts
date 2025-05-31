import {
  BuiltJob,
  CurrentDateProvider,
  DateProvider,
  Job,
  JobSpec,
  JobState,
} from '@racyn/kujob-core';
import { Pool } from './pool.js';

/**
 * Abstract the operation of adding jobs to the queue
 */
export class AddJobsCommand {
  static DEFAULT_BATCH_SIZE = 1000;

  private pool: Pool;
  private queueName: string;
  private chunkSize: number;
  private dateProvider: DateProvider;

  constructor(props: {
    pool: Pool;
    queueName: string;
    chunkSize?: number;
    dateProvider?: DateProvider;
  }) {
    this.pool = props.pool;
    this.queueName = props.queueName;
    this.chunkSize = props.chunkSize ?? AddJobsCommand.DEFAULT_BATCH_SIZE;
    this.dateProvider = props.dateProvider ?? CurrentDateProvider.INSTANCE;
  }

  async execute(builders: JobSpec[]): Promise<BuiltJob[]> {
    if (builders.length === 0) {
      return [];
    }

    const jobs = builders.map((builder) => this.jobFromSpec(builder));
    const batches = this.batch(jobs);
    const queries = batches.map((chunk) => this.toSqlQuery(chunk));

    // transactional bulk insert
    await this.pool.transaction(async (client) => {
      for (const { query, params } of queries) {
        await client.query(query, params);
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
  private jobFromSpec(spec: JobSpec): JobState {
    return Job.fromSpec({
      spec,
      queueId: this.queueName,
      dateProvider: this.dateProvider,
    }).getState();
  }

  /**
   * Split the jobs into batches of a fixed size
   * Because PostgreSQL has a limit on the number of parameters in a query,
   * @param jobs
   * @private
   */
  private batch<T>(jobs: T[]) {
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
  private toSqlQuery(jobs: JobState[]) {
    const bindings = [];
    const params: any[] = [];
    let idx = 1;

    for (const job of jobs) {
      bindings.push(
        [
          `(`,
          `$${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, `,
          `$${idx + 5}, $${idx + 6}, $${idx + 7}, $${idx + 8}, $${idx + 9}, `,
          `$${idx + 10}, $${idx + 11}, $${idx + 12}, $${idx + 13}, $${idx + 14}, `,
          `$${idx + 15}`,
          `)`,
        ].join(''),
      );

      params.push(
        job.id,
        this.queueName,
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

      idx += 16;
    }

    const query = `
        INSERT INTO jobs VALUES ${bindings.join(', ')}
    `;

    return { query, params };
  }
}
