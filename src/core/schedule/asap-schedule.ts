import { RunAtParams, ScheduleStrategy } from './schedule-strategy.js';
import { isObj } from '../../utils/validation.js';

type Serialized = {
  type: 'asap';
};

/**
 * Run the job as soon as possible.
 */
export class AsapSchedule implements ScheduleStrategy {
  /**
   * The Asap schedule has no specific configuration,
   * So it makes sense to use a singleton instance.
   */
  static INSTANCE = new AsapSchedule();

  static deserializable(data: object): data is Serialized {
    return isObj(data) && 'type' in data && data['type'] === 'asap';
  }

  static deserialize(data: Serialized) {
    return new AsapSchedule();
  }

  serialize(): Serialized {
    return {
      type: 'asap',
    };
  }

  firstRunAt(params: RunAtParams): Date {
    return params.now;
  }

  nextRunAt(params: RunAtParams): Date | null {
    return null;
  }

  scheduledForNextRun() {}
}
