import { RunAtParams, Schedule } from './schedule.js';
import { isObj } from '../../utils/validation.js';
import { CronExpressionParser } from 'cron-parser';

type Serialized = {
  type: 'cron';
  expression: string;
};

export class Cron implements Schedule {
  private expression: string;

  static deserializable(data: object): data is Serialized {
    return isObj(data) && 'type' in data && data['type'] === 'cron';
  }

  static deserialize(data: Serialized) {
    return new Cron({
      expression: data.expression,
    });
  }

  constructor(props: { expression: string }) {
    this.expression = props.expression;
  }

  serialize(): object {
    return {
      type: 'cron',
      expression: this.expression,
    };
  }

  firstRunAt(params: RunAtParams): Date {
    return this.nextRunAtDate(params);
  }

  nextRunAt(params: RunAtParams): Date | null {
    return this.nextRunAtDate(params);
  }

  scheduledForNextRun(): void {}

  private nextRunAtDate(params: RunAtParams): Date {
    const interval = CronExpressionParser.parse(this.expression, {
      currentDate: params.now,
      tz: 'utc',
    });

    return new Date(interval.next().toISOString()!);
  }
}
