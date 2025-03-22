export interface LimitSpec {
  jobsPerMinute(): number;
}

export class DefaultLimitSpecification implements LimitSpec {
  private max: number;
  private every: number;

  constructor(props: {
    max: number;
    every: number; // in seconds
  }) {
    this.max = props.max;
    this.every = props.every;
  }

  jobsPerMinute(): number {
    return this.max / (this.every / 60);
  }
}
