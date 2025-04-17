export type ScheduleForParams = {
  /**
   * The date at the moment the job is tasked to be rescheduled
   */
  now: Date;

  /**
   * The number of attempts that have been done so far
   */
  attemptsDone: number;

  /**
   * The maximum number of attempts that can be done
   * Not used.
   */
  attemptsMax: number;
};

/**
 * Strategy to reschedule a job once it has failed
 */
export interface BackoffStrategy {
  /**
   * Serialize the data representation of the object
   * to be stored in database without the database knowing
   * the concrete implementation.
   */
  serialize(): object | null;

  /**
   * Determines when to run the job after it failed
   * @param params
   */
  scheduleFor(params: ScheduleForParams): Date;
}
