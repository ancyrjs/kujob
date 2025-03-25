import { CronExpressionParser } from 'cron-parser';
import { RunAtParams, ScheduleStrategy } from './schedule-strategy.js';
import { isObj } from '../utils/validation.js';

type Serialized = {
  type: 'cron';
  pattern: string;
  timezone: string | null;
};

/**
 * Runs a job according to a cron expression.
 */
export class CronSchedule implements ScheduleStrategy {
  private pattern: string;
  private timezone: string | null = null;

  static deserializable(data: object): data is Serialized {
    return isObj(data) && 'type' in data && data['type'] === 'cron';
  }

  static deserialize(data: Serialized) {
    return new CronSchedule({
      pattern: data.pattern,
      timezone: data.timezone,
    });
  }

  constructor(props: { pattern: string; timezone?: string | null }) {
    this.pattern = props.pattern;
    this.timezone = props.timezone ?? null;
  }

  serialize(): object {
    return {
      type: 'cron',
      expression: this.pattern,
      timezone: this.timezone,
    };
  }

  firstRunAt(params: RunAtParams): Date {
    return this.nextRunAtDate(params);
  }

  nextRunAt(params: RunAtParams): Date | null {
    return this.nextRunAtDate(params);
  }

  scheduledForNextRun(): void {}

  /**
   * Calculate the next run date.
   * @param params
   * @private
   */
  private nextRunAtDate(params: RunAtParams): Date {
    const interval = CronExpressionParser.parse(this.pattern, {
      currentDate: params.now,
      tz: this.timezone ?? undefined,
    });

    return new Date(interval.next().toISOString()!);
  }
}
