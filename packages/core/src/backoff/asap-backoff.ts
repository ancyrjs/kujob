import { isObj } from '../utils/validation.js';
import { BackoffStrategy, ScheduleForParams } from './backoff-strategy.js';

type Serialized = {
  type: 'asap';
};

/**
 * Rerun the job as soon as possible.
 */
export class AsapBackoff implements BackoffStrategy {
  static INSTANCE = new AsapBackoff();

  static deserializable(data: object): data is Serialized {
    return isObj(data) && 'type' in data && data['type'] === 'asap';
  }

  static deserialize(data: Serialized) {
    return new AsapBackoff();
  }

  serialize(): Serialized {
    return {
      type: 'asap',
    };
  }

  scheduleFor(params: ScheduleForParams): Date {
    return params.now;
  }
}
