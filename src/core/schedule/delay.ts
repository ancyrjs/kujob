import { RunAtParams, Schedule } from './schedule.js';
import { Duration } from '../../utils/duration.js';
import { isObj } from '../../utils/validation.js';

type Serialized = {
  type: 'delay';
  ms: number;
  repeat: boolean;
};

/**
 * Delay the execution of a job for a given duration.
 * The job can optionally be repeated.
 */
export class Delay implements Schedule {
  private duration: Duration;
  private repeat: boolean;

  constructor(props: { duration: Duration; repeat?: boolean }) {
    this.duration = props.duration;
    this.repeat = props.repeat ?? false;
  }

  static deserializable(data: object): data is Serialized {
    return isObj(data) && 'type' in data && data['type'] === 'delay';
  }

  static deserialize(data: Serialized) {
    return new Delay({ duration: Duration.milliseconds(data.ms) });
  }

  serialize(): Serialized {
    return {
      type: 'delay',
      ms: this.duration.toMilliseconds(),
      repeat: this.repeat,
    };
  }

  firstRunAt(params: RunAtParams): Date {
    return this.duration.addToDate(params.now);
  }

  nextRunAt(params: RunAtParams): Date | null {
    if (this.repeat === false) {
      return null;
    }

    return this.duration.addToDate(params.now);
  }

  scheduledForNextRun(): void {}
}
