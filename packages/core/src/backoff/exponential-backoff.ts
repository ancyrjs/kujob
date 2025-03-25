import { addMilliseconds } from 'date-fns';
import { isObj } from '../utils/validation.js';
import { BackoffStrategy, ScheduleForParams } from './backoff-strategy.js';
import { Duration } from '../utils/duration.js';

type Serialized = {
  type: 'exponential';
  ms: number;
};

/**
 * Rerun the job after an exponentially increasing delay
 */
export class ExponentialBackoff implements BackoffStrategy {
  private increment: Duration;

  static deserializable(data: object): data is Serialized {
    return isObj(data) && 'type' in data && data['type'] === 'exponential';
  }

  static deserialize(data: Serialized) {
    return new ExponentialBackoff({
      increment: Duration.milliseconds(data.ms),
    });
  }

  constructor(props: { increment: Duration }) {
    this.increment = props.increment;
  }

  serialize(): Serialized {
    return {
      type: 'exponential',
      ms: this.increment.toMilliseconds(),
    };
  }

  scheduleFor(params: ScheduleForParams): Date {
    return addMilliseconds(
      params.now,
      this.increment
        .mulityplyBy(Math.pow(2, params.attemptsDone - 1))
        .toMilliseconds(),
    );
  }
}
