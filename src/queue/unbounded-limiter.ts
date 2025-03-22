import { JobsToFetchPayload, Limiter } from './limiter.js';

export class UnboundedLimiter implements Limiter {
  async jobsToFetch({ desired }: JobsToFetchPayload) {
    return desired;
  }
}
