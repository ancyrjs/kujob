import { isObj } from '../../utils/validation.js';
import { BackoffStrategy, ScheduleForParams } from './backoff-strategy.js';
import { Duration } from '../../utils/duration.js';

type Serialized = {
  type: 'fixed';
  ms: number;
};

/**
 * Rerun the job after a fixed delay
 */
export class FixedBackoff implements BackoffStrategy {
  private duration: Duration;

  static deserializable(data: object): data is Serialized {
    return isObj(data) && 'type' in data && data['type'] === 'delay';
  }

  static deserialize(data: Serialized) {
    return new FixedBackoff({
      duration: Duration.milliseconds(data.ms),
    });
  }

  constructor(props: { duration: Duration }) {
    this.duration = props.duration;
  }

  serialize(): Serialized {
    return {
      type: 'fixed',
      ms: this.duration.toMilliseconds(),
    };
  }

  scheduleFor(params: ScheduleForParams): Date {
    return this.duration.addToDate(params.now);
  }
}
