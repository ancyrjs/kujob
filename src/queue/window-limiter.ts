import { endOfMinute, startOfMinute } from 'date-fns';
import { JobsToFetchPayload, Limiter } from './limiter.js';

export class WindowLimiter implements Limiter {
  static HEARTBEAT_DELAY = 120;

  private max: number;

  private every: number;

  constructor(config: { max: number; every: number }) {
    this.max = config.max;
    this.every = config.every;
  }

  jobsPerMinute(): number {
    return this.max / (this.every / 60);
  }

  async jobsToFetch({ desired, client }: JobsToFetchPayload) {
    const activeWorkersQuery = await client.query(
      `
        SELECT COUNT(*) AS active_workers 
        FROM workers 
        WHERE heartbeat > NOW() - INTERVAL '${WindowLimiter.HEARTBEAT_DELAY} seconds'
        `,
      [],
    );

    const activeWorkersCount = parseInt(
      activeWorkersQuery.rows[0].active_workers,
      10,
    );

    const windowStart = startOfMinute(new Date());
    const windowEnd = endOfMinute(new Date());

    const activeJobsQuery = await client.query(
      `SELECT COUNT(*) AS processing_jobs FROM jobs WHERE status = 'completed' AND started_at >= $1 AND started_at <= $2`,
      [windowStart, windowEnd],
    );

    const activeJobs = parseInt(activeJobsQuery.rows[0].processing_jobs, 10);

    const jobsPerMinute = this.jobsPerMinute();
    const maxJobsPerMinute = Math.ceil(jobsPerMinute / activeWorkersCount);
    const jobsRemaining = jobsPerMinute - activeJobs;

    return Math.min(maxJobsPerMinute, jobsRemaining);
  }
}
