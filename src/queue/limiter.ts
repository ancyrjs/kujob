export interface Limiter {
  jobsPerMinute(): number;
  isLimited(): boolean;
}

/**
 * Nice naming my dude
 */
abstract class LimitedLimiter implements Limiter {
  abstract jobsPerMinute(): number;

  isLimited(): boolean {
    return true;
  }
}

export class DefaultLimiter extends LimitedLimiter {
  private max: number;
  private every: number;

  constructor(props: {
    max: number;
    every: number; // in seconds
  }) {
    super();
    this.max = props.max;
    this.every = props.every;
  }

  jobsPerMinute(): number {
    return this.max / (this.every / 60);
  }
}

export class UnboundedLimiter implements Limiter {
  jobsPerMinute(): number {
    return Number.POSITIVE_INFINITY;
  }

  isLimited(): boolean {
    return false;
  }
}
