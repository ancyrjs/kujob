import { endOfMinute, startOfMinute } from 'date-fns';
import { JobsToFetchPayload, Limiter } from './limiter.js';

/**
 * Implements a sliding window algorithm to decide how many jobs a worker can fetch
 */
export class WindowLimiter implements Limiter {
  /**
   * The delay in seconds to consider a worker as active
   */
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

    const window = new SlidingWindow();

    const activeJobsQuery = await client.query(
      `SELECT COUNT(*) AS processing_jobs FROM jobs WHERE status = 'completed' AND started_at >= $1 AND started_at <= $2`,
      [window.getStart(), window.getEnd()],
    );

    const activeJobs = parseInt(activeJobsQuery.rows[0].processing_jobs, 10);

    const jobsPerMinute = this.jobsPerMinute();
    const maxJobsPerMinute = Math.ceil(jobsPerMinute / activeWorkersCount);
    const jobsRemaining = jobsPerMinute - activeJobs;

    return Math.min(maxJobsPerMinute, jobsRemaining);
  }
}

class SlidingWindow {
  private start: Date;

  private end: Date;

  constructor() {
    this.start = startOfMinute(new Date());
    this.end = endOfMinute(new Date());
  }

  getStart() {
    return this.start;
  }

  getEnd() {
    return this.end;
  }
}
