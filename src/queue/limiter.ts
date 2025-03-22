import { PoolClient } from 'pg';

export type JobsToFetchPayload = {
  desired: number;
  client: PoolClient;
};

export interface Limiter {
  jobsToFetch(payload: JobsToFetchPayload): Promise<number>;
}
