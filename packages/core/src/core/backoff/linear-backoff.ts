import { addMilliseconds } from 'date-fns';
import { isObj } from '../../utils/validation.js';
import { BackoffStrategy, ScheduleForParams } from './backoff-strategy.js';
import { Duration } from '../../utils/duration.js';

type Serialized = {
  type: 'linear';
  ms: number;
};

/**
 * Rerun the job after a linearly increasing delay
 */
export class LinearBackoff implements BackoffStrategy {
  private increment: Duration;

  static deserializable(data: object): data is Serialized {
    return isObj(data) && 'type' in data && data['type'] === 'linear';
  }

  static deserialize(data: Serialized) {
    return new LinearBackoff({
      increment: Duration.milliseconds(data.ms),
    });
  }

  constructor(props: { increment: Duration }) {
    this.increment = props.increment;
  }

  serialize(): Serialized {
    return {
      type: 'linear',
      ms: this.increment.toMilliseconds(),
    };
  }

  scheduleFor(params: ScheduleForParams): Date {
    return addMilliseconds(
      params.now,
      this.increment.mulityplyBy(params.attemptsDone).toMilliseconds(),
    );
  }
}
