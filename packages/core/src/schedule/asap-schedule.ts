import { RunAtParams, ScheduleStrategy } from './schedule-strategy.js';

type Serialized = null;

/**
 * Run the job as soon as possible.
 */
export class AsapSchedule implements ScheduleStrategy {
  /**
   * The Asap schedule has no specific configuration,
   * So it makes sense to use a singleton instance.
   */
  static INSTANCE = new AsapSchedule();

  static deserializable(data: any): data is null {
    return data === null;
  }

  static deserialize(data: Serialized) {
    return new AsapSchedule();
  }

  serialize(): Serialized {
    return null;
  }

  firstRunAt(params: RunAtParams): Date {
    return params.now;
  }

  nextRunAt(params: RunAtParams): Date | null {
    return null;
  }
}
