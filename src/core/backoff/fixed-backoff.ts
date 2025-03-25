import { isObj } from '../../utils/validation.js';
import { BackoffStrategy, ScheduleForParams } from './backoff-strategy.js';
import { addMilliseconds } from 'date-fns';

type Serialized = {
  type: 'fixed';
  ms: number;
};

/**
 * Rerun the job after a fixed delay
 */
export class FixedBackoff implements BackoffStrategy {
  private ms: number;

  static deserializable(data: object): data is Serialized {
    return isObj(data) && 'type' in data && data['type'] === 'delay';
  }

  static deserialize(data: Serialized) {
    return new FixedBackoff({
      ms: data.ms,
    });
  }

  constructor(props: { ms: number }) {
    this.ms = props.ms;
  }

  serialize(): Serialized {
    return {
      type: 'fixed',
      ms: this.ms,
    };
  }

  scheduleFor(params: ScheduleForParams): Date {
    return addMilliseconds(params.now, this.ms);
  }
}
