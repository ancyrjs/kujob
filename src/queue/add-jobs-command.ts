import { Pool } from '../pool.js';
import { Logger } from '../loggers/logger.js';
import { generateUuid } from '../generate-uuid.js';

export type AddJobInput = {
  type: string;
  id?: string;
  payload?: Record<string, any>;
  priority?: number;
  attempts?: number;
  delay?: number;
};

type AddableJob = {
  id: string;
  queueId: number;
  type: string;
  payload: Record<string, any>;
  priority: number;
  attempts: number;
  delay: number;
};

/**
 * Abstract the operation of adding jobs to the queue
 */
export class AddJobsCommand {
  static DEFAULT_CHUNK_SIZE = 1000;

  private pool: Pool;
  private queueId: number;
  private logger: Logger;
  private chunkSize: number;

  constructor(props: {
    pool: Pool;
    queueId: number;
    logger: Logger;
    chunkSize?: number;
  }) {
    this.pool = props.pool;
    this.queueId = props.queueId;
    this.logger = props.logger;
    this.chunkSize = props.chunkSize ?? AddJobsCommand.DEFAULT_CHUNK_SIZE;
  }

  async execute(configs: AddJobInput[]): Promise<string[]> {
    if (configs.length === 0) {
      return [];
    }

    const jobs = configs.map(this.createJob.bind(this));
    const chunks = this.chunkJobs(jobs);
    const queries = chunks.map(this.toInsertQuery.bind(this));

    // transactional bulk insert
    await this.pool.transaction(async (client) => {
      // Note : does it make sense to run it sequentially or can we run them in Promise.all ?
      for (const { queryText, queryParams } of queries) {
        await client.query(queryText, queryParams);
      }
    });

    // Return all job IDs
    return jobs.map((job) => job.id);
  }

  /**
   * Create a job object and supply default values
   * @param config
   * @private
   */
  private createJob(config: AddJobInput): AddableJob {
    return {
      queueId: this.queueId,
      type: config.type,
      id: config?.id ?? generateUuid(),
      payload: config?.payload ?? {},
      priority: config?.priority ?? 0,
      attempts: config?.attempts ?? 1,
      delay: config?.delay ?? 0,
    };
  }

  /**
   * Split the jobs into chunks
   * @param jobs
   * @private
   */
  private chunkJobs(jobs: AddableJob[]) {
    const out: AddableJob[][] = [];

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
  private toInsertQuery(jobs: AddableJob[]) {
    const valueStrings = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    for (const job of jobs) {
      valueStrings.push(
        `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, NOW()::TIMESTAMPTZ + ($${paramIndex + 6} || ' milliseconds')::INTERVAL)`,
      );

      queryParams.push(
        job.id,
        job.queueId,
        job.type,
        JSON.stringify(job.payload),
        job.priority,
        job.attempts,
        job.delay.toString(),
      );

      paramIndex += 7;
    }

    const queryText = `
        INSERT INTO jobs (id, queue_id, type, payload, priority, attempts, scheduled_for)
        VALUES ${valueStrings.join(', ')}
    `;

    return { queryText, queryParams };
  }
}
