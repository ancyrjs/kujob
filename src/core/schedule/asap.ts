import { NextRunAtParams, Schedule } from './schedule.js';
import { isObj } from '../../utils/validation.js';

type Serialized = {
  type: 'asap';
};

/**
 * Run the job as soon as possible.
 */
export class Asap implements Schedule {
  /**
   * The Asap schedule has no specific configuration,
   * So it makes sense to use a singleton instance.
   */
  static INSTANCE = new Asap();

  static deserializable(data: object): data is Serialized {
    return isObj(data) && 'type' in data && data['type'] === 'asap';
  }

  static deserialize(data: Serialized) {
    return new Asap();
  }

  serialize(): Serialized {
    return {
      type: 'asap',
    };
  }

  shouldReschedule(): boolean {
    return false;
  }

  nextRunAt(params: NextRunAtParams): Date {
    return params.now;
  }
}
