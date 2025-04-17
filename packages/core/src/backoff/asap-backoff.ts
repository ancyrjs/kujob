import { BackoffStrategy, ScheduleForParams } from './backoff-strategy.js';

type Serialized = null;

/**
 * Rerun the job as soon as possible.
 */
export class AsapBackoff implements BackoffStrategy {
  static INSTANCE = new AsapBackoff();

  static deserializable(data: any): data is Serialized {
    return data === null;
  }

  static deserialize(data: Serialized) {
    return new AsapBackoff();
  }

  serialize(): Serialized {
    return null;
  }

  scheduleFor(params: ScheduleForParams): Date {
    return params.now;
  }
}
