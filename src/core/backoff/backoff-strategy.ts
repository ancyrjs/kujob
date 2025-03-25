export type ScheduleForParams = {
  now: Date;
  attemptsDone: number;
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
  serialize(): object;

  /**
   * Determines when to run the job after it failed
   * @param params
   */
  scheduleFor(params: ScheduleForParams): Date;
}
