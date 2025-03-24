import { Asap } from './asap.js';
import { Delay } from './delay.js';
import { Schedule } from './schedule.js';

export interface ScheduleConstructor<T extends Schedule = Schedule> {
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
  private static Options: ScheduleConstructor[] = [Asap, Delay];

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
  static findFromSerialized(data: object): ScheduleConstructor | null {
    return this.Options.find((option) => option.deserializable(data)) ?? null;
  }
}
