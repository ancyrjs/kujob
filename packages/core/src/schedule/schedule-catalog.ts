import { AsapSchedule } from './asap-schedule.js';
import { DelaySchedule } from './delay-schedule.js';
import { ScheduleStrategy } from './schedule-strategy.js';

export interface ScheduleConstructor<
  T extends ScheduleStrategy = ScheduleStrategy,
> {
  new (...args: any[]): T;
  deserializable: (obj: object) => boolean;
  deserialize: (obj: any) => T;
}

/**
 * Catalog of available schedule objects.
 * Schedules can be added at run time by clients and will
 * automatically be handled by the system.
 */
export class ScheduleCatalog {
  private static Options: ScheduleConstructor[] = [AsapSchedule, DelaySchedule];

  /**
   * Register a new schedule object.
   * @param schedule
   */
  static register(schedule: ScheduleConstructor) {
    if (!this.Options.includes(schedule)) {
      ScheduleCatalog.register(schedule);
    }
  }

  /**
   * Match serialized data to a schedule object.
   * @param data
   */
  static deserialize(data: object): ScheduleConstructor | null {
    return this.Options.find((option) => option.deserializable(data)) ?? null;
  }
}
