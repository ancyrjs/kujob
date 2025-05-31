export type RunAtParams = {
  now: Date;
};

/**
 * Strategy to schedule the next run of a job.
 */
export interface ScheduleStrategy {
  /**
   * Serialize the data representation of the object
   * to be stored in database without the database knowing
   * the concrete implementation.
   */
  serialize(): object | null;

  /**
   * Determines when to run the job first
   * @param params
   */
  firstRunAt(params: RunAtParams): Date;

  /**
   * Determines when to run the job after its completion
   * @param params
   */
  nextRunAt(params: RunAtParams): Date | null;
}
